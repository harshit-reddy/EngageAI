'use strict';

const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const cors     = require('cors');
const fs       = require('fs').promises;
const path     = require('path');
const crypto   = require('crypto');

// ─── App setup ────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
  pingTimeout: 60000,
});

// ─── JSON file storage ───────────────────────────────────────────────
const DB = path.join(__dirname, 'db.json');

async function readDB() {
  try {
    const data = JSON.parse(await fs.readFile(DB, 'utf8'));
    return { sessions: {}, feedback: [], ...data };
  } catch {
    return { sessions: {}, feedback: [] };
  }
}

async function writeDB(data) {
  await fs.writeFile(DB, JSON.stringify(data, null, 2), 'utf8');
}

const newId = () => crypto.randomBytes(3).toString('hex').toUpperCase();

// ─── In-memory room state ────────────────────────────────────────────
// rooms[meetingId][socketId] = { name, role, samples[], activePct, lastMetrics }
const rooms = {};

// Session summary accumulator (tracks stats over lifetime of session)
// sessionSummaries[meetingId] = { startTime, participants: { name: { scores[], emotions{} } } }
const sessionSummaries = {};

function roomSnapshot(meetingId) {
  return Object.entries(rooms[meetingId] ?? {}).map(([id, p]) => ({
    id,
    name:        p.name,
    role:        p.role,
    activePct:   p.activePct   ?? 0,
    lastMetrics: p.lastMetrics ?? null,
  }));
}

// ─── REST routes ────────────────────────────────────────────────────

app.get('/', (_req, res) => res.send('EngageAI backend running'));

// Create session
app.post('/session', async (req, res) => {
  const id = newId();
  const db = await readDB();
  db.sessions[id] = {
    id,
    speakerName: (req.body.name || 'Speaker').trim(),
    createdAt:   Date.now(),
    endedAt:     null,
  };
  await writeDB(db);
  console.log(`[session] created  ${id}`);
  res.json({ sessionId: id });
});

// Validate session
app.get('/session/:id', async (req, res) => {
  const db = await readDB();
  const s  = db.sessions[req.params.id];
  if (!s)        return res.status(404).json({ error: 'Session not found' });
  if (s.endedAt) return res.status(410).json({ error: 'Session has ended' });
  res.json(s);
});

// End session — compute and broadcast summary
app.patch('/session/:id/end', async (req, res) => {
  const id = req.params.id;
  const db = await readDB();
  const s  = db.sessions[id];
  if (!s) return res.status(404).json({ error: 'Session not found' });
  s.endedAt = Date.now();
  await writeDB(db);

  // Build session summary
  let summary = null;
  const ss = sessionSummaries[id];
  if (ss) {
    const participantSummaries = Object.entries(ss.participants).map(([pName, data]) => {
      const avg = data.scores.length
        ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        : 0;
      const topEmo = Object.entries(data.emotions).sort(([, a], [, b]) => b - a)[0]?.[0] || 'neutral';
      return { name: pName, avgEngagement: avg, dominantEmotion: topEmo, totalSamples: data.scores.length };
    });

    const allScores = participantSummaries.map(p => p.avgEngagement);
    const overallAvg = allScores.length
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0;

    summary = {
      duration: Math.floor((Date.now() - ss.startTime) / 1000),
      overallEngagement: overallAvg,
      participantCount: participantSummaries.length,
      participants: participantSummaries,
    };
  }

  io.to(id).emit('sessionEnded', { summary });
  console.log(`[session] ended    ${id}`);
  res.json({ ok: true, summary });
});

// Get session summary
app.get('/session/:id/summary', (req, res) => {
  const ss = sessionSummaries[req.params.id];
  if (!ss?.final) return res.status(404).json({ error: 'No summary available' });
  res.json(ss.final);
});

// Submit private feedback
app.post('/feedback', async (req, res) => {
  const { meetingId, from, message } = req.body;
  if (!meetingId || !message)
    return res.status(400).json({ error: 'meetingId and message are required' });

  const db   = await readDB();
  const item = { id: crypto.randomUUID(), meetingId, from: from || 'Anonymous', message, createdAt: Date.now() };
  db.feedback.push(item);
  await writeDB(db);

  io.to(`speaker:${meetingId}`).emit('newFeedback', item);
  res.json({ ok: true, item });
});

// Fetch feedback for a session
app.get('/feedback/:meetingId', async (req, res) => {
  const db = await readDB();
  res.json({ feedback: db.feedback.filter(f => f.meetingId === req.params.meetingId) });
});

// ─── Socket.IO ──────────────────────────────────────────────────────

io.on('connection', socket => {
  console.log(`[socket] connect    ${socket.id}`);

  socket.on('join', ({ meetingId, role, name }) => {
    if (!meetingId || !role || !name) return;

    socket.join(meetingId);
    socket.data = { meetingId, role, name };

    if (role === 'speaker') socket.join(`speaker:${meetingId}`);

    rooms[meetingId] ??= {};
    rooms[meetingId][socket.id] = { name, role, samples: [], activePct: 0, lastMetrics: null };

    io.to(meetingId).emit('roomUpdate', { meetingId, participants: roomSnapshot(meetingId) });
    console.log(`[room]   join       ${name} -> ${meetingId} (${role})`);
  });

  // Audience sends engagement metrics every ~700 ms
  socket.on('engagement', payload => {
    const { meetingId, name, metrics } = payload ?? {};
    if (!meetingId || !metrics) return;

    const p = rooms[meetingId]?.[socket.id];
    if (p) {
      p.lastMetrics = metrics;
      p.samples.push(metrics.engagementScore ?? 0);
      if (p.samples.length > 30) p.samples.shift();
      p.activePct = Math.round(p.samples.reduce((a, b) => a + b, 0) / p.samples.length);
    }

    // Accumulate data for session summary
    if (!sessionSummaries[meetingId]) {
      sessionSummaries[meetingId] = { startTime: Date.now(), participants: {} };
    }
    const ss = sessionSummaries[meetingId];
    if (!ss.participants[name]) {
      ss.participants[name] = { scores: [], emotions: {} };
    }
    ss.participants[name].scores.push(metrics.engagementScore ?? 0);
    const emo = metrics.emotion;
    if (emo) ss.participants[name].emotions[emo] = (ss.participants[name].emotions[emo] || 0) + 1;

    // Forward to speaker
    io.to(`speaker:${meetingId}`).emit('audienceEngagement', {
      participantId: socket.id,
      name,
      metrics,
      activePct: p?.activePct ?? 0,
    });

    // Alert speaker if overall engagement drops below 40%
    const allParts = Object.values(rooms[meetingId] || {}).filter(x => x.role === 'audience');
    const allScores = allParts.map(x => x.activePct).filter(s => s > 0);
    if (allScores.length >= 1) {
      const avg = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
      if (avg < 40) {
        io.to(`speaker:${meetingId}`).emit('alert', {
          type: 'low_engagement',
          message: `Overall engagement has dropped to ${avg}%`,
          level: 'warning',
          ts: Date.now(),
        });
      }
    }
  });

  socket.on('disconnect', () => {
    const { meetingId, name } = socket.data ?? {};
    if (meetingId && rooms[meetingId]) {
      delete rooms[meetingId][socket.id];
      if (!Object.keys(rooms[meetingId]).length) delete rooms[meetingId];
      else io.to(meetingId).emit('roomUpdate', { meetingId, participants: roomSnapshot(meetingId) });
    }
    console.log(`[socket] disconnect ${socket.id} (${name ?? '?'})`);
  });
});

// ─── Start ──────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 4000;
httpServer.listen(PORT, '0.0.0.0', () => console.log(`EngageAI backend  ->  http://0.0.0.0:${PORT}`));
