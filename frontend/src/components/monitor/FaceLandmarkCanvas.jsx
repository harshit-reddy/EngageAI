import React, { useRef, useEffect } from 'react';
import {
  FACE_OVAL, LEFT_EYE, RIGHT_EYE, LEFT_EYEBROW, RIGHT_EYEBROW,
  LIPS_OUTER, LIPS_INNER, LEFT_IRIS, RIGHT_IRIS, NOSE,
  TESSELATION, KEY_POINTS,
} from '../../utils/faceMeshConnections';

function drawEdges(ctx, lm, edges, color, lineW) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW;
  ctx.beginPath();
  for (const [a, b] of edges) {
    if (!lm[a] || !lm[b]) continue;
    ctx.moveTo(lm[a].x, lm[a].y);
    ctx.lineTo(lm[b].x, lm[b].y);
  }
  ctx.stroke();
}

export default function FaceLandmarkCanvas({ landmarks, width = 280, height = 210 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !landmarks || landmarks.length === 0) return;
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    // Scale normalised landmarks to canvas pixels
    const lm = landmarks.map(pt => ({ x: pt.x * width, y: pt.y * height }));

    // ── Layer 1: Tesselation mesh ──
    drawEdges(ctx, lm, TESSELATION, 'rgba(0,255,170,0.18)', 0.7);

    // ── Layer 2: All dots ──
    ctx.fillStyle = 'rgba(0,255,170,0.3)';
    for (const pt of lm) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Layer 3: Face oval ──
    ctx.shadowColor = 'rgba(0,255,170,0.3)';
    ctx.shadowBlur = 3;
    drawEdges(ctx, lm, FACE_OVAL, 'rgba(0,255,170,0.55)', 1.2);
    ctx.shadowBlur = 0;

    // ── Layer 4: Nose ──
    drawEdges(ctx, lm, NOSE, 'rgba(0,255,170,0.5)', 1);

    // ── Layer 5: Eyes (blue glow) ──
    ctx.shadowColor = 'rgba(0,150,255,0.5)';
    ctx.shadowBlur = 5;
    drawEdges(ctx, lm, LEFT_EYE, 'rgba(0,180,255,0.85)', 1.5);
    drawEdges(ctx, lm, RIGHT_EYE, 'rgba(0,180,255,0.85)', 1.5);
    ctx.shadowBlur = 0;

    // ── Layer 6: Eyebrows (orange) ──
    drawEdges(ctx, lm, LEFT_EYEBROW, 'rgba(255,170,0,0.7)', 1.3);
    drawEdges(ctx, lm, RIGHT_EYEBROW, 'rgba(255,170,0,0.7)', 1.3);

    // ── Layer 7: Lips (pink glow) ──
    ctx.shadowColor = 'rgba(255,50,120,0.4)';
    ctx.shadowBlur = 4;
    drawEdges(ctx, lm, LIPS_OUTER, 'rgba(255,80,140,0.8)', 1.4);
    drawEdges(ctx, lm, LIPS_INNER, 'rgba(255,80,140,0.6)', 1);
    ctx.shadowBlur = 0;

    // ── Layer 8: Iris (cyan glow) ──
    if (lm.length > 477) {
      ctx.shadowColor = 'rgba(0,230,255,0.8)';
      ctx.shadowBlur = 6;
      drawEdges(ctx, lm, LEFT_IRIS, 'rgba(0,230,255,0.95)', 1.5);
      drawEdges(ctx, lm, RIGHT_IRIS, 'rgba(0,230,255,0.95)', 1.5);
      ctx.fillStyle = 'rgba(0,230,255,1)';
      [468, 473].forEach(i => {
        if (!lm[i]) return;
        ctx.beginPath();
        ctx.arc(lm[i].x, lm[i].y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    }

    // ── Layer 9: Key structural points ──
    ctx.shadowColor = 'rgba(0,255,200,0.7)';
    ctx.shadowBlur = 5;
    ctx.fillStyle = 'rgba(0,255,200,0.9)';
    for (const i of KEY_POINTS) {
      if (!lm[i]) continue;
      ctx.beginPath();
      ctx.arc(lm[i].x, lm[i].y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }, [landmarks, width, height]);

  if (!landmarks || landmarks.length === 0) {
    return (
      <div className="landmark-canvas-empty">No face detected</div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="landmark-detail-canvas"
      width={width}
      height={height}
    />
  );
}
