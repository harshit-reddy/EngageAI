import React, { useRef, useState, useEffect, useCallback } from 'react';

const COLORS = ['#ffffff', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#a78bfa', '#ec4899'];
const SIZES  = [2, 4, 8, 14];

/**
 * Shared whiteboard — drawing canvas synced via Socket.IO.
 * Uses normalized coordinates (0-1) for cross-resolution compatibility.
 */
export default function Whiteboard({ meetingId, socketRef }) {
  const canvasRef = useRef(null);
  const ctxRef    = useRef(null);
  const drawing   = useRef(false);
  const points    = useRef([]);

  const [color, setColor] = useState('#ffffff');
  const [size,  setSize]  = useState(4);

  /* Setup canvas + socket listeners */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width  = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctxRef.current = ctx;
    };
    resize();
    window.addEventListener('resize', resize);

    /* Listen for remote strokes */
    const socket = socketRef.current;
    const onDraw = (data) => {
      if (data.meetingId !== meetingId) return;
      drawStroke(data.stroke);
    };
    const onClear = () => {
      const ctx = ctxRef.current;
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    if (socket) {
      socket.on('whiteboard_draw', onDraw);
      socket.on('whiteboard_clear', onClear);
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (socket) {
        socket.off('whiteboard_draw', onDraw);
        socket.off('whiteboard_clear', onClear);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  /* Draw a normalized stroke onto canvas */
  const drawStroke = useCallback((stroke) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas || stroke.points.length < 2) return;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.beginPath();

    const pts = stroke.points;
    ctx.moveTo(pts[0].x * canvas.width, pts[0].y * canvas.height);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x * canvas.width, pts[i].y * canvas.height);
    }
    ctx.stroke();
  }, []);

  /* Get normalized position from event */
  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top)  / rect.height,
    };
  }

  function onPointerDown(e) {
    drawing.current = true;
    points.current = [getPos(e)];

    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.beginPath();
    const p = points.current[0];
    ctx.moveTo(p.x * canvas.width, p.y * canvas.height);
  }

  function onPointerMove(e) {
    if (!drawing.current) return;
    const pos = getPos(e);
    points.current.push(pos);

    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.lineTo(pos.x * canvas.width, pos.y * canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x * canvas.width, pos.y * canvas.height);
  }

  function onPointerUp() {
    if (!drawing.current) return;
    drawing.current = false;

    // Emit completed stroke
    const socket = socketRef.current;
    if (socket?.connected && points.current.length >= 2) {
      socket.emit('whiteboard_draw', {
        meetingId,
        stroke: { points: points.current, color, size },
      });
    }
    points.current = [];
  }

  function clearBoard() {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    const socket = socketRef.current;
    if (socket?.connected) socket.emit('whiteboard_clear', { meetingId });
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
        background: '#161b22', borderRadius: 10,
      }}>
        {/* Color picker */}
        <div style={{ display: 'flex', gap: 4 }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 24, height: 24, borderRadius: '50%', border: color === c ? '2px solid #e2e8f0' : '2px solid transparent',
              background: c, cursor: 'pointer', transition: 'border-color .15s',
            }} />
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: '#30363d' }} />

        {/* Pen sizes */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {SIZES.map(s => (
            <button key={s} onClick={() => setSize(s)} style={{
              width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
              background: size === s ? '#1e3a5f' : '#1e2433',
              border: size === s ? '1px solid #3b82f6' : '1px solid #30363d',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: Math.min(s + 2, 16), height: Math.min(s + 2, 16),
                borderRadius: '50%', background: '#e2e8f0',
              }} />
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: '#30363d' }} />

        {/* Clear */}
        <button onClick={clearBoard} style={{
          background: '#7f1d1d', color: '#fca5a5', border: '1px solid #ef4444',
          borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          Clear
        </button>
      </div>

      {/* Canvas */}
      <div style={{
        flex: 1, background: '#1a1a2e', borderRadius: 12, overflow: 'hidden',
        border: '1px solid #21262d', position: 'relative', minHeight: 300,
        touchAction: 'none',
      }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        />
      </div>
    </div>
  );
}
