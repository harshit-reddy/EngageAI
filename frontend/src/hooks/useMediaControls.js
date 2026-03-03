import { useState, useCallback } from 'react';
import logger from '../utils/logger';

/**
 * Hook for mute/unmute and video on/off.
 * Uses track.enabled = false so no re-permission is needed.
 */
export default function useMediaControls(streamRef, { initialMuted = false, initialVideoOff = false } = {}) {
  const [isMuted,    setIsMuted]    = useState(initialMuted);
  const [isVideoOff, setIsVideoOff] = useState(initialVideoOff);

  const toggleMute = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    const next = !audioTracks[0]?.enabled;
    audioTracks.forEach(t => { t.enabled = next; });
    setIsMuted(!next);
    logger.media('Toggled mute:', !next);
  }, [streamRef]);

  const toggleVideo = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const videoTracks = stream.getVideoTracks();
    const next = !videoTracks[0]?.enabled;
    videoTracks.forEach(t => { t.enabled = next; });
    setIsVideoOff(!next);
    logger.media('Toggled video:', !next);
  }, [streamRef]);

  const forceMute = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    logger.media('Force muted by host');
    stream.getAudioTracks().forEach(t => { t.enabled = false; });
    setIsMuted(true);
  }, [streamRef]);

  return { isMuted, isVideoOff, toggleMute, toggleVideo, forceMute };
}
