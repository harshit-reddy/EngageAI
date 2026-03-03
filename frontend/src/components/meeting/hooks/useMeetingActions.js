import { useCallback } from 'react';
import axios from 'axios';
import { SERVER } from '../../../api';

/**
 * Provides all meeting action handlers as stable callbacks.
 */
export default function useMeetingActions({
  meetingId, userName, socketRef, streamRef, screenStreamRef,
  replaceVideoTrack, stopSTT,
  setScreenStream, setHandRaised, setShowChat, setShowPeople,
  setUnreadChat, setUnreadDm, setCopied, setDmTarget,
  handRaised, showChat, dmTarget, lanIp,
  onLeave,
}) {
  const cleanup = useCallback(() => {
    stopSTT();
    socketRef.current?.disconnect();
    streamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
  }, [stopSTT]);

  const handleLeave = useCallback(() => { cleanup(); onLeave(); }, [cleanup, onLeave]);

  const endSession = useCallback(async () => {
    try { await axios.patch(`${SERVER}/session/${meetingId}/end`); } catch {}
  }, [meetingId]);

  const closeSummary = useCallback(() => { cleanup(); onLeave(); }, [cleanup, onLeave]);

  const sendFeedback = useCallback(async () => {
    const msg = window.prompt('Feedback for the presenter:');
    if (!msg?.trim()) return;
    try {
      await axios.post(`${SERVER}/feedback`, { meetingId, from: userName, message: msg.trim() });
    } catch {}
  }, [meetingId, userName]);

  const startAnalysis = useCallback(async () => {
    try { await axios.post(`${SERVER}/session/${meetingId}/monitor`); } catch {}
  }, [meetingId]);

  const stopAnalysis = useCallback(async () => {
    try { await axios.post(`${SERVER}/session/${meetingId}/stop-monitor`); } catch {}
  }, [meetingId]);

  const openMonitor = useCallback(() => {
    const url = `${window.location.origin}?monitor=${meetingId}&name=${encodeURIComponent(userName)}`;
    window.open(url, '_blank');
  }, [meetingId, userName]);

  const sendReaction = useCallback((emoji) => {
    socketRef.current?.emit('reaction', { meetingId, name: userName, emoji });
  }, [meetingId, userName]);

  const toggleHand = useCallback(() => {
    const next = !handRaised;
    setHandRaised(next);
    socketRef.current?.emit('raise_hand', { meetingId, name: userName, raised: next });
  }, [meetingId, userName, handRaised]);

  const sendChat = useCallback((text) => {
    socketRef.current?.emit('chat_message', { meetingId, name: userName, text });
  }, [meetingId, userName]);

  const sendDm = useCallback((text) => {
    if (!dmTarget) return;
    socketRef.current?.emit('direct_message', {
      meetingId, name: userName, to: dmTarget.sid, text,
    });
  }, [meetingId, userName, dmTarget]);

  const openDmWith = useCallback((participant) => {
    setDmTarget({ sid: participant.id, name: participant.name });
    setShowChat(true);
    setShowPeople(false);
    setUnreadDm(0);
  }, []);

  const clearDmTarget = useCallback(() => setDmTarget(null), []);

  const muteParticipant = useCallback((peerId) => {
    socketRef.current?.emit('mute_participant', { meetingId, peerId });
  }, [meetingId]);

  const muteAll = useCallback(() => {
    socketRef.current?.emit('mute_all', { meetingId });
  }, [meetingId]);

  const togglePeople = useCallback(() => {
    setShowPeople(v => !v);
    setShowChat(false);
  }, []);

  const toggleChat = useCallback(() => {
    const willOpen = !showChat;
    setShowChat(willOpen);
    setShowPeople(false);
    if (willOpen) {
      if (dmTarget) setUnreadDm(0);
      else setUnreadChat(0);
    }
  }, [showChat, dmTarget]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      screenStreamRef.current = stream;
      setScreenStream(stream);
      replaceVideoTrack(track);
      socketRef.current?.emit('screen_share_started', { meetingId });
      track.onended = () => stopScreenShare();
    } catch {}
  }, [meetingId, replaceVideoTrack]);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    const camTrack = streamRef.current?.getVideoTracks()[0];
    if (camTrack) replaceVideoTrack(camTrack);
    socketRef.current?.emit('screen_share_stopped', { meetingId });
  }, [meetingId, replaceVideoTrack]);

  const copyInvite = useCallback(() => {
    const inviteUrl = `https://${lanIp}:${window.location.port || 3000}?join=${meetingId}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [lanIp, meetingId]);

  return {
    cleanup, handleLeave, endSession, closeSummary,
    sendFeedback, startAnalysis, stopAnalysis, openMonitor,
    sendReaction, toggleHand, sendChat, sendDm,
    openDmWith, clearDmTarget, muteParticipant, muteAll,
    togglePeople, toggleChat,
    startScreenShare, stopScreenShare, copyInvite,
  };
}
