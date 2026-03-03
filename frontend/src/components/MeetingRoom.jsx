import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { SERVER } from '../api';
import MeetingToolbar from './MeetingToolbar';
import VideoGrid from './VideoGrid';
import Whiteboard from './Whiteboard';
import TranscriptPanel from './TranscriptPanel';
import ReactionOverlay from './ReactionOverlay';
import ParticipantPanel from './ParticipantPanel';
import ChatPanel from './ChatPanel';
import WaitingLobby from './WaitingLobby';
import MeetingHeader from './meeting/MeetingHeader';
import SummaryModal from './meeting/SummaryModal';
import useMediaControls from '../hooks/useMediaControls';
import useWebRTC from '../hooks/useWebRTC';
import useFrameCapture from '../hooks/useFrameCapture';
import useSpeechToText from '../hooks/useSpeechToText';

export default function MeetingRoom({ meetingId, userName, role, onLeave, meetingName, initialStream, initialMuted = false, initialVideoOff = false }) {
  const isHost = role === 'speaker';

  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const startRef = useRef(Date.now());
  const activeRef = useRef(true);
  const screenStreamRef = useRef(null);
  const showChatRef = useRef(false);
  const reactionIdRef = useRef(0);

  const videoRefCallback = useCallback((el) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(() => {});
    }
  }, []);

  // ── Core state ──
  const [stage, setStage] = useState('loading');
  const [errMsg, setErrMsg] = useState('');
  const [connected, setConnected] = useState(false);
  const [localSid, setLocalSid] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [localStream, setLocalStream] = useState(null);

  // ── Panels ──
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // ── Participants ──
  const [participants, setParticipants] = useState([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [speakingPeers, setSpeakingPeers] = useState(new Set());

  // ── Screen share ──
  const [screenStream, setScreenStream] = useState(null);

  // ── Summary ──
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState(null);

  // ── Transcript & alerts ──
  const [transcript, setTranscript] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // ── Reactions & hand ──
  const [reactions, setReactions] = useState([]);
  const [handRaised, setHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState({});

  // ── Chat ──
  const [chatMessages, setChatMessages] = useState([]);
  const [unreadChat, setUnreadChat] = useState(0);
  const [dmTarget, setDmTarget] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const [unreadDm, setUnreadDm] = useState(0);

  // ── Lobby ──
  const [lobbyWaiting, setLobbyWaiting] = useState(false);
  const [lobbyQueue, setLobbyQueue] = useState([]);

  // ── Analysis ──
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);

  // ── Audio unlock ──
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [audioToast, setAudioToast] = useState(false);

  // ── LAN invite ──
  const [lanIp, setLanIp] = useState(window.location.hostname);
  const [copied, setCopied] = useState(false);

  // ── Hooks ──
  const { isMuted, isVideoOff, toggleMute, toggleVideo, forceMute } = useMediaControls(streamRef, { initialMuted, initialVideoOff });
  const { remoteStreams, signalReady, replaceVideoTrack } = useWebRTC({
    socketRef, localStream, meetingId, userName, connected,
  });
  const { metrics } = useFrameCapture({
    videoRef, streamRef, socketRef, meetingId, userName,
    enabled: monitoringEnabled && !screenStream, isVideoOff,
  });

  const handleTranscriptResult = useCallback((text) => {
    socketRef.current?.emit('transcript_line', { meetingId, name: userName, text });
  }, [meetingId, userName]);

  const { start: startSTT, stop: stopSTT } = useSpeechToText({
    onResult: handleTranscriptResult, enabled: !isMuted,
  });

  // ── Derived ──
  const inviteUrl = `https://${lanIp}:${window.location.port || 3000}?join=${meetingId}`;

  // ── Effects ──
  useEffect(() => {
    if (stage !== 'ready') return;
    if (isMuted) stopSTT(); else startSTT();
  }, [isMuted, stage, startSTT, stopSTT]);

  useEffect(() => { showChatRef.current = showChat; }, [showChat]);
  useEffect(() => { if (showChat && !dmTarget) setUnreadChat(0); }, [showChat, dmTarget]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch LAN IP
  useEffect(() => {
    if (lanIp === 'localhost' || lanIp === '127.0.0.1') {
      axios.get(`${SERVER}/network-info`).then(r => setLanIp(r.data.ip)).catch(() => {});
    }
  }, []);

  // Broadcast media status
  useEffect(() => {
    if (!socketRef.current?.connected || stage !== 'ready') return;
    socketRef.current.emit('media_status', { meetingId, name: userName, isMuted, isVideoOff });
  }, [isMuted, isVideoOff, meetingId, userName, stage]);

  // Speaking detection (local)
  useEffect(() => {
    if (stage !== 'ready' || !streamRef.current) return;
    let ctx, analyser, buf;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(streamRef.current);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      buf = new Uint8Array(analyser.frequencyBinCount);
    } catch { return; }

    let wasSpeaking = false;
    const interval = setInterval(() => {
      if (!socketRef.current?.connected) return;
      analyser.getByteFrequencyData(buf);
      const level = buf.reduce((s, v) => s + v, 0) / buf.length;
      const speaking = !isMuted && level > 12;
      if (speaking !== wasSpeaking) {
        wasSpeaking = speaking;
        socketRef.current.emit('audio_activity', { meetingId, isSpeaking: speaking });
      }
    }, 300);
    return () => { clearInterval(interval); ctx.close().catch(() => {}); };
  }, [stage, meetingId, isMuted]);

  // ── Cleanup ──
  function cleanup() {
    activeRef.current = false;
    stopSTT();
    socketRef.current?.disconnect();
    streamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
  }

  // ── Main setup ──
  useEffect(() => {
    activeRef.current = true;
    async function init() {
      let stream;
      if (initialStream) {
        // Use stream from pre-join screen
        stream = initialStream;
        streamRef.current = stream;
        setLocalStream(stream);
      } else {
        // Reconnection path or no pre-join — acquire media directly
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });
          streamRef.current = stream;
          setLocalStream(stream);
        } catch {
          setErrMsg('Camera or microphone access was denied. Please allow permissions and refresh.');
          setStage('error');
          return;
        }
      }
      if (!activeRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const io = (await import('socket.io-client')).default;
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
        setParticipants(prev => prev.map(p => p.id === peerId ? { ...p, isMuted: m, isVideoOff: v } : p));
      });
      socket.on('audio_activity', ({ peerId, isSpeaking }) => {
        setSpeakingPeers(prev => { const n = new Set(prev); if (isSpeaking) n.add(peerId); else n.delete(peerId); return n; });
      });
      socket.on('chat_message', (msg) => {
        setChatMessages(prev => [...prev, msg]);
        if (!showChatRef.current) setUnreadChat(prev => prev + 1);
      });
      socket.on('direct_message', (msg) => {
        setDmMessages(prev => [...prev, msg]);
        if (!showChatRef.current) setUnreadDm(prev => prev + 1);
      });
      socket.on('monitoring_started', () => setMonitoringEnabled(true));
      socket.on('monitoring_stopped', () => setMonitoringEnabled(false));
      socket.on('force_mute', () => forceMute());
      socket.on('sessionEnded', (data) => {
        if (data?.summary) { setSummary(data.summary); setShowSummary(true); }
        else { cleanup(); onLeave(); }
      });
      socket.on('transcript_line', (line) => setTranscript(prev => [...prev, line]));
      socket.on('alert', a => setAlerts(prev => [a, ...prev].slice(0, 5)));
      socket.on('reaction', ({ name, emoji }) => {
        const id = ++reactionIdRef.current;
        setReactions(prev => [...prev, { id, name, emoji }]);
        setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3500);
      });
      socket.on('hand_raised', ({ peerId, name, raised }) => {
        setRaisedHands(prev => ({ ...prev, [peerId]: raised ? name : null }));
      });
      socket.on('screen_share_started', () => {});
      socket.on('screen_share_stopped', () => {});

      // ── Lobby events ──
      socket.on('waiting', () => { setLobbyWaiting(true); setStage('ready'); });
      socket.on('admitted', () => {
        setLobbyWaiting(false);
        socket.emit('join', { meetingId, role, name: userName });
        setTimeout(() => signalReady(), 500);
      });
      socket.on('rejected', () => { cleanup(); onLeave(); });
      socket.on('lobby_update', ({ waiting }) => setLobbyQueue(waiting || []));

      setStage('ready');
    }
    init();
    return () => { activeRef.current = false; cleanup(); };
  }, [meetingId, userName, role]);

  // ── Action handlers ──
  function handleLeave() { cleanup(); onLeave(); }
  async function endSession() { try { await axios.patch(`${SERVER}/session/${meetingId}/end`); } catch {} }
  function closeSummary() { cleanup(); onLeave(); }
  async function sendFeedback() {
    const msg = window.prompt('Feedback for the presenter:');
    if (!msg?.trim()) return;
    try { await axios.post(`${SERVER}/feedback`, { meetingId, from: userName, message: msg.trim() }); } catch {}
  }
  async function startAnalysis() { try { await axios.post(`${SERVER}/session/${meetingId}/monitor`); } catch {} }
  async function stopAnalysis() { try { await axios.post(`${SERVER}/session/${meetingId}/stop-monitor`); } catch {} }
  function openMonitor() { window.open(`${window.location.origin}?monitor=${meetingId}&name=${encodeURIComponent(userName)}`, '_blank'); }
  function sendReaction(emoji) { socketRef.current?.emit('reaction', { meetingId, name: userName, emoji }); }
  function toggleHand() { const next = !handRaised; setHandRaised(next); socketRef.current?.emit('raise_hand', { meetingId, name: userName, raised: next }); }
  function sendChat(text) { socketRef.current?.emit('chat_message', { meetingId, name: userName, text }); }
  function sendDm(text) { if (!dmTarget) return; socketRef.current?.emit('direct_message', { meetingId, name: userName, to: dmTarget.sid, text }); }
  function openDmWith(p) { setDmTarget({ sid: p.id, name: p.name }); setShowChat(true); setShowPeople(false); setUnreadDm(0); }
  function clearDmTarget() { setDmTarget(null); }
  function muteParticipant(peerId) { socketRef.current?.emit('mute_participant', { meetingId, peerId }); }
  function muteAll() { socketRef.current?.emit('mute_all', { meetingId }); }
  function togglePeople() { setShowPeople(v => !v); setShowChat(false); setShowTranscript(false); }
  function toggleChat() {
    const willOpen = !showChat; setShowChat(willOpen); setShowPeople(false); setShowTranscript(false);
    if (willOpen) { if (dmTarget) setUnreadDm(0); else setUnreadChat(0); }
  }
  async function startScreenShare() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      screenStreamRef.current = stream; setScreenStream(stream);
      replaceVideoTrack(track);
      socketRef.current?.emit('screen_share_started', { meetingId });
      track.onended = () => stopScreenShare();
    } catch {}
  }
  function stopScreenShare() {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null; setScreenStream(null);
    const camTrack = streamRef.current?.getVideoTracks()[0];
    if (camTrack) replaceVideoTrack(camTrack);
    socketRef.current?.emit('screen_share_stopped', { meetingId });
  }
  function copyInvite() {
    navigator.clipboard.writeText(inviteUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  }

  function unlockAudio() {
    if (audioUnlocked) return;
    document.querySelectorAll('.remote-audio').forEach(el => {
      el.play().catch(() => {});
    });
    setAudioUnlocked(true);
    setAudioToast(true);
    setTimeout(() => setAudioToast(false), 2000);
  }

  const peerStatus = {};
  participants.forEach(p => { peerStatus[p.id] = { isMuted: p.isMuted, isVideoOff: p.isVideoOff }; });

  // ── Lobby waiting ──
  if (lobbyWaiting) {
    return <WaitingLobby meetingId={meetingId} onLeave={() => { cleanup(); onLeave(); }} />;
  }

  // ── Loading ──
  if (stage === 'loading') {
    return (
      <div className="meeting-loading">
        <div className="spinner" />
        <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 14 }}>Setting up meeting...</p>
        <video ref={videoRefCallback} autoPlay muted playsInline
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
      </div>
    );
  }

  // ── Error ──
  if (stage === 'error') {
    return (
      <div className="meeting-loading">
        <div className="error-card">
          <div className="error-card-title">Setup Error</div>
          <div className="error-card-msg">{errMsg}</div>
        </div>
        <button onClick={onLeave} className="btn-secondary" style={{ marginTop: 16 }}>Back to Home</button>
      </div>
    );
  }

  // ── Meeting ──
  return (
    <div className="meeting-room" onClick={unlockAudio}>
      <video ref={videoRefCallback} autoPlay muted playsInline
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />

      {audioToast && (
        <div className="audio-toast">Audio enabled</div>
      )}

      <MeetingHeader
        meetingId={meetingId} meetingName={meetingName} elapsed={elapsed} connected={connected}
        monitoringEnabled={monitoringEnabled} participantCount={participantCount}
        inviteUrl={inviteUrl} copied={copied} onCopyInvite={copyInvite}
      />

      {isHost && lobbyQueue.length > 0 && (
        <div className="lobby-notification">
          <span>{lobbyQueue.length} waiting to join</span>
          <button onClick={() => socketRef.current?.emit('admit_all', { meetingId })}>Admit All</button>
          <button onClick={() => socketRef.current?.emit('reject_all', { meetingId })}>Reject All</button>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="alert-bar">
          {alerts.slice(0, 2).map((a, i) => (
            <div key={i} className="alert-item"><span>&#9888;</span> {a.message}</div>
          ))}
        </div>
      )}

      <div className="meeting-body">
        <div className="meeting-content">
          {showWhiteboard ? (
            <Whiteboard meetingId={meetingId} socketRef={socketRef} />
          ) : (
            <VideoGrid
              localStream={localStream} localName={userName} remoteStreams={remoteStreams}
              isVideoOff={isVideoOff} isMuted={isMuted} screenShareStream={screenStream}
              raisedHands={raisedHands} localHandRaised={handRaised} peerStatus={peerStatus}
              speakingPeers={speakingPeers} localSid={localSid} metrics={metrics}
              monitoringEnabled={monitoringEnabled}
              landmarks={monitoringEnabled ? metrics?.landmarks : null}
            />
          )}
          <ReactionOverlay reactions={reactions} />
        </div>

        {showPeople && (
          <ParticipantPanel participants={participants} localSid={localSid} isHost={isHost}
            speakingPeers={speakingPeers} onMuteParticipant={muteParticipant} onMuteAll={muteAll}
            onClose={() => setShowPeople(false)} onDm={openDmWith} />
        )}

        {showChat && (
          <ChatPanel messages={chatMessages} onSend={sendChat}
            onClose={() => { setShowChat(false); setDmTarget(null); }}
            localName={userName} localSid={localSid} dmTarget={dmTarget}
            dmMessages={dmMessages} onSendDm={sendDm} onClearDm={clearDmTarget} />
        )}

        {showTranscript && (
          <TranscriptPanel lines={transcript} onClose={() => setShowTranscript(false)} />
        )}
      </div>

      <MeetingToolbar
        isMuted={isMuted} isVideoOff={isVideoOff} toggleMute={toggleMute} toggleVideo={toggleVideo}
        showWhiteboard={showWhiteboard} onToggleWhiteboard={() => setShowWhiteboard(v => !v)}
        showTranscript={showTranscript} onToggleTranscript={() => { setShowTranscript(v => !v); setShowPeople(false); setShowChat(false); }}
        isScreenSharing={!!screenStream} onToggleScreenShare={screenStream ? stopScreenShare : startScreenShare}
        handRaised={handRaised} onToggleHand={toggleHand} onReaction={sendReaction}
        isHost={isHost} onOpenMonitor={isHost && monitoringEnabled ? openMonitor : null}
        onStartAnalysis={isHost && !monitoringEnabled ? startAnalysis : null}
        onStopAnalysis={isHost && monitoringEnabled ? stopAnalysis : null}
        monitoringEnabled={monitoringEnabled} onSendFeedback={!isHost ? sendFeedback : null}
        onLeave={handleLeave} onEndSession={isHost ? endSession : null}
        showPeople={showPeople} onTogglePeople={togglePeople}
        showChat={showChat} onToggleChat={toggleChat}
        participantCount={participantCount} unreadChat={unreadChat + unreadDm}
      />

      {showSummary && summary && <SummaryModal summary={summary} onClose={closeSummary} />}
    </div>
  );
}
