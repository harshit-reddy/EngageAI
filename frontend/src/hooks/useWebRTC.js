import { useState, useRef, useCallback, useEffect } from 'react';
import logger from '../utils/logger';

const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

/**
 * WebRTC mesh hook — manages peer connections for video sharing.
 * Each participant connects directly to every other participant.
 */
export default function useWebRTC({ socketRef, localStream, meetingId, userName, connected }) {
  const [remoteStreams, setRemoteStreams] = useState({});
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  localStreamRef.current = localStream;

  const createPeer = useCallback((peerId, peerName) => {
    if (peersRef.current[peerId]) return peersRef.current[peerId];

    logger.webrtc('Creating peer connection for', peerName, peerId);
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peersRef.current[peerId] = pc;

    // Add local tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // When we receive remote tracks
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        logger.webrtc('Received remote track from', peerName);
        setRemoteStreams(prev => ({
          ...prev,
          [peerId]: { stream, name: peerName },
        }));
      }
    };

    // Send ICE candidates to remote peer
    let iceCandidateLogged = false;
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        if (!iceCandidateLogged) {
          logger.webrtc('ICE candidate for', peerId);
          iceCandidateLogged = true;
        }
        socketRef.current?.emit('rtc_ice', {
          to: peerId,
          candidate: event.candidate,
        });
      }
    };

    // Clean up failed connections
    pc.onconnectionstatechange = () => {
      logger.webrtc('Peer', peerId, 'connection state:', pc.connectionState);
      if (pc.connectionState === 'failed') {
        removePeer(peerId);
      }
    };

    return pc;
  }, [socketRef]);

  const removePeer = useCallback((peerId) => {
    logger.webrtc('Removing peer', peerId);
    const pc = peersRef.current[peerId];
    if (pc) {
      pc.close();
      delete peersRef.current[peerId];
    }
    setRemoteStreams(prev => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  // Setup socket listeners for WebRTC signaling
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // A new peer joined — we (existing peer) create an offer
    const onPeerJoined = async ({ peerId, name }) => {
      logger.webrtc('New peer joined, creating offer for', name);
      const pc = createPeer(peerId, name);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('rtc_offer', { to: peerId, offer: pc.localDescription });
      } catch (e) {
        logger.webrtc('Error:', e.message);
        console.error('RTC offer error:', e);
      }
    };

    // Received an offer — create answer
    const onOffer = async ({ from, offer, name }) => {
      logger.webrtc('Received offer from', name);
      const pc = createPeer(from, name);
      try {
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('rtc_answer', { to: from, answer: pc.localDescription });
      } catch (e) {
        logger.webrtc('Error:', e.message);
        console.error('RTC answer error:', e);
      }
    };

    // Received an answer
    const onAnswer = async ({ from, answer }) => {
      logger.webrtc('Received answer from', from);
      const pc = peersRef.current[from];
      if (pc) {
        try {
          await pc.setRemoteDescription(answer);
        } catch (e) {
          logger.webrtc('Error:', e.message);
          console.error('RTC set answer error:', e);
        }
      }
    };

    // Received an ICE candidate
    const onIce = async ({ from, candidate }) => {
      const pc = peersRef.current[from];
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(candidate);
        } catch {}
      }
    };

    // A peer left — clean up
    const onPeerLeft = ({ peerId }) => {
      removePeer(peerId);
    };

    socket.on('rtc_peer_joined', onPeerJoined);
    socket.on('rtc_offer', onOffer);
    socket.on('rtc_answer', onAnswer);
    socket.on('rtc_ice', onIce);
    socket.on('rtc_peer_left', onPeerLeft);

    return () => {
      socket.off('rtc_peer_joined', onPeerJoined);
      socket.off('rtc_offer', onOffer);
      socket.off('rtc_answer', onAnswer);
      socket.off('rtc_ice', onIce);
      socket.off('rtc_peer_left', onPeerLeft);
      // Close all peer connections
      Object.values(peersRef.current).forEach(pc => pc.close());
      peersRef.current = {};
    };
  }, [socketRef, connected, createPeer, removePeer]);

  // Signal that we're ready for WebRTC connections
  const signalReady = useCallback(() => {
    socketRef.current?.emit('rtc_ready', { meetingId, name: userName });
  }, [socketRef, meetingId, userName]);

  // Replace video track in all connections (for screen share)
  const replaceVideoTrack = useCallback((newTrack) => {
    Object.values(peersRef.current).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(newTrack).catch(() => {});
      }
    });
  }, []);

  return { remoteStreams, signalReady, replaceVideoTrack, removePeer };
}
