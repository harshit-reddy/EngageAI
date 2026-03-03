import { useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

/**
 * Sets up the Socket.IO connection and registers all event listeners.
 * Returns { socketRef, connected, localSid }.
 */
export default function useMeetingSocket({
  meetingId, userName, role, stage,
  signalReady, forceMute, showChatRef,
  setConnected, setLocalSid, setParticipants, setParticipantCount,
  setSpeakingPeers, setChatMessages, setDmMessages,
  setMonitoringEnabled, setTranscript, setAlerts,
  setReactions, setRaisedHands, setSummary, setShowSummary,
  setUnreadChat, setUnreadDm, onCleanupAndLeave,
  reactionIdRef,
}) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (stage !== 'ready' && stage !== 'loading') return;
    // Socket is created in the main init, not here — this registers listeners only
  }, [stage]);

  const createSocket = useCallback(() => {
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setLocalSid(socket.id);
      socket.emit('join', { meetingId, role, name: userName });
      setTimeout(() => signalReady(), 500);
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('roomUpdate', ({ participants: list }) => {
      setParticipants(list || []);
      setParticipantCount(list?.length || 0);
    });

    socket.on('media_status', ({ peerId, isMuted: m, isVideoOff: v }) => {
      setParticipants(prev => prev.map(p =>
        p.id === peerId ? { ...p, isMuted: m, isVideoOff: v } : p
      ));
    });

    socket.on('audio_activity', ({ peerId, isSpeaking }) => {
      setSpeakingPeers(prev => {
        const next = new Set(prev);
        if (isSpeaking) next.add(peerId);
        else next.delete(peerId);
        return next;
      });
    });

    socket.on('chat_message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
      if (!showChatRef.current) {
        setUnreadChat(prev => prev + 1);
      }
    });

    socket.on('direct_message', (msg) => {
      setDmMessages(prev => [...prev, msg]);
      if (!showChatRef.current) {
        setUnreadDm(prev => prev + 1);
      }
    });

    socket.on('monitoring_started', () => setMonitoringEnabled(true));
    socket.on('monitoring_stopped', () => setMonitoringEnabled(false));
    socket.on('force_mute', () => forceMute());

    socket.on('sessionEnded', (data) => {
      if (data?.summary) {
        setSummary(data.summary);
        setShowSummary(true);
      } else {
        onCleanupAndLeave();
      }
    });

    socket.on('transcript_line', (line) => setTranscript(prev => [...prev, line]));
    socket.on('alert', a => setAlerts(prev => [a, ...prev].slice(0, 5)));

    socket.on('reaction', ({ name, emoji }) => {
      const id = ++reactionIdRef.current;
      setReactions(prev => [...prev, { id, name, emoji }]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== id));
      }, 3500);
    });

    socket.on('hand_raised', ({ peerId, name, raised }) => {
      setRaisedHands(prev => ({ ...prev, [peerId]: raised ? name : null }));
    });

    socket.on('screen_share_started', () => {});
    socket.on('screen_share_stopped', () => {});

    return socket;
  }, [meetingId, userName, role]);

  return { socketRef, createSocket };
}
