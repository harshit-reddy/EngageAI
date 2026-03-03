import { useState, useEffect, useRef } from 'react';
import logger from '../utils/logger';

const TICK_MS = 1000;
const CAPTURE_W = 320;
const CAPTURE_H = 240;

/**
 * Captures video frames + audio level and sends to the Python ML backend
 * for real-time engagement analysis via MediaPipe + GradientBoosting.
 */
export default function useFrameCapture({
  videoRef, streamRef, socketRef,
  meetingId, userName, enabled, isVideoOff,
}) {
  const [metrics, setMetrics] = useState(null);
  const activeRef = useRef(true);
  const canvasRef = useRef(null);
  const audioRef = useRef({ ctx: null, analyser: null, buf: null });

  const resultCountRef = useRef(0);

  useEffect(() => {
    if (!enabled || !streamRef.current) return;
    activeRef.current = true;
    logger.ml('Frame capture started for', userName);

    // Canvas for frame capture (offscreen)
    const canvas = document.createElement('canvas');
    canvas.width = CAPTURE_W;
    canvas.height = CAPTURE_H;
    canvasRef.current = canvas;

    // Audio analyser
    let ctx, analyser, buf;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(streamRef.current);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      buf = new Uint8Array(analyser.frequencyBinCount);
      audioRef.current = { ctx, analyser, buf };
    } catch {
      audioRef.current = { ctx: null, analyser: null, buf: null };
    }

    // Listen for ML results
    const socket = socketRef.current;
    const onResult = (data) => {
      resultCountRef.current += 1;
      if (resultCountRef.current % 5 === 1) {
        logger.ml('Engagement result:', data.engagementScore);
      }
      setMetrics(data);
    };
    socket?.on('engagement_result', onResult);

    // Capture loop
    const interval = setInterval(() => {
      if (!activeRef.current || !socketRef.current?.connected) return;

      // Audio level
      let audioLevel = 0;
      const a = audioRef.current;
      if (a.analyser && a.buf) {
        a.analyser.getByteFrequencyData(a.buf);
        const audioEnabled = streamRef.current?.getAudioTracks()[0]?.enabled ?? true;
        audioLevel = audioEnabled
          ? Math.round(a.buf.reduce((s, v) => s + v, 0) / a.buf.length)
          : 0;
      }

      // Frame capture
      const video = videoRef.current;
      const videoEnabled = streamRef.current?.getVideoTracks()[0]?.enabled ?? true;
      let frame = null;

      if (video && videoEnabled && video.readyState >= 2) {
        const c = canvasRef.current;
        const ctx2d = c.getContext('2d');
        ctx2d.drawImage(video, 0, 0, CAPTURE_W, CAPTURE_H);
        frame = c.toDataURL('image/jpeg', 0.5);
      }

      socketRef.current.emit('analyze_frame', {
        meetingId,
        name: userName,
        frame,
        audioLevel,
        videoOff: !videoEnabled,
      });
    }, TICK_MS);

    return () => {
      logger.ml('Frame capture stopped');
      activeRef.current = false;
      clearInterval(interval);
      socket?.off('engagement_result', onResult);
      if (audioRef.current.ctx) {
        audioRef.current.ctx.close().catch(() => {});
      }
    };
  }, [enabled, streamRef, videoRef, socketRef, meetingId, userName]);

  return { metrics };
}
