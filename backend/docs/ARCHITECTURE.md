# EngageAI Backend — System Architecture

## Overview

EngageAI is a real-time meeting engagement analysis platform built with Flask, Flask-SocketIO, MediaPipe, and scikit-learn. It processes webcam frames via ML to produce engagement scores, emotion classification, and attention tracking — all on a local network.

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  (Camera capture, WebRTC, UI, Charts)                    │
└──────────┬──────────────────────────────────┬────────────┘
           │ REST API (HTTP)                  │ WebSocket (Socket.IO)
           │                                  │
┌──────────▼──────────────────────────────────▼────────────┐
│                   Flask + SocketIO Server                 │
│                                                          │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Routes    │  │   Sockets    │  │    ML Pipeline   │  │
│  │ (REST API) │  │ (Real-time)  │  │  (FaceAnalyzer)  │  │
│  └─────┬─────┘  └──────┬───────┘  └────────┬─────────┘  │
│        │               │                    │            │
│  ┌─────▼───────────────▼────────────────────▼─────────┐  │
│  │              In-Memory State (state.py)             │  │
│  │  rooms, session_summaries, transcripts, chat, etc.  │  │
│  └─────────────────────┬──────────────────────────────┘  │
│                        │                                 │
│  ┌─────────────────────▼──────────────────────────────┐  │
│  │              MongoDB (Persistence Layer)            │  │
│  │    sessions | analytics | feedback  collections     │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Package Structure

```
backend/
├── app.py                  # Slim entrypoint (~45 lines)
├── config.py               # All env vars, thresholds, constants
├── extensions.py           # Flask, SocketIO, MongoDB init
├── state.py                # In-memory room state dicts
├── validators.py           # Input validation & sanitisation
├── utils.py                # Shared helpers (IDs, IP, snapshots)
│
├── ml/                     # Machine Learning Pipeline
│   ├── constants.py        # Landmark indices, model path
│   ├── feature_extraction.py  # Geometric feature functions
│   ├── state_trackers.py   # Blink, head, audio trackers
│   ├── classifiers.py      # Emotion & attention classifiers
│   ├── engagement_model.py # GradientBoosting regressor
│   └── analyzer.py         # FaceAnalyzer orchestrator
│
├── models/                 # Database access layer
│   ├── session.py          # Session CRUD
│   ├── analytics.py        # Analytics read/write
│   └── feedback.py         # Feedback CRUD
│
├── routes/                 # REST API (Flask Blueprints)
│   ├── admin.py            # POST /admin/login
│   ├── sessions.py         # Session CRUD + monitor
│   ├── meetings.py         # Meeting list + analytics
│   ├── feedback.py         # Feedback submit + retrieve
│   └── network.py          # Health check + network info
│
├── sockets/                # WebSocket handlers
│   ├── connection.py       # join, disconnect
│   ├── analysis.py         # analyze_frame (ML pipeline)
│   ├── media.py            # media_status, audio, screen share
│   ├── chat.py             # chat, direct messages
│   ├── interaction.py      # reactions, hand raise, mute
│   ├── webrtc.py           # WebRTC signalling
│   ├── whiteboard.py       # whiteboard draw/clear
│   └── transcript.py       # transcript lines
│
├── tests/                  # pytest test suite
└── docs/                   # Documentation
```

## Data Flow

### Frame Analysis Pipeline

```
1. Client captures webcam frame (JPEG, ~640x480)
2. Base64-encoded frame sent via Socket.IO "analyze_frame" event
3. Server decodes → PIL Image → NumPy array → MediaPipe FaceLandmarker
4. 478-point face mesh landmarks extracted
5. Feature extraction: EAR, MAR, smile, brow, gaze, head pose, symmetry
6. State trackers update: blink rate, PERCLOS drowsiness, head velocity
7. Classifiers run: emotion (9 states), attention (4 states)
8. GradientBoosting model predicts engagement score (0-100)
9. Results emitted back to client via Socket.IO "analysis_result"
10. Every 10 frames: analytics written to MongoDB
```

### State Management

**In-Memory (state.py):**
- `rooms`: Active participants per meeting (socket ID → participant data)
- `session_summaries`: Aggregated analytics per participant per meeting
- `transcripts`: Real-time speech transcript lines
- `chat_messages`: Chat message history per room
- `raised_hands`: Set of socket IDs with hands raised
- `monitored_sessions`: Set of meeting IDs with active ML monitoring

**Persistent (MongoDB):**
- `sessions`: Meeting metadata (ID, host, timestamps)
- `analytics`: ML analysis results per meeting (scores, emotions, timeline)
- `feedback`: Participant feedback messages

## Thread Safety

- SocketIO uses `eventlet` async mode (green threads)
- In-memory state is accessed from event handlers within the same process
- MongoDB operations are atomic at the document level
- ML analyzer is stateful (per-participant trackers) but accessed from event handlers sequentially

## Startup Order (Critical)

```python
# 1. Load ML BEFORE eventlet.monkey_patch()
from ml.analyzer import FaceAnalyzer  # MediaPipe + sklearn
analyzer = FaceAnalyzer()

# 2. Monkey-patch for eventlet async
import eventlet
eventlet.monkey_patch()

# 3. Import Flask app, register routes & sockets
from extensions import app, socketio
register_routes(app)
register_sockets(socketio, analyzer)

# 4. Run
socketio.run(app)
```

This ordering is critical: MediaPipe and scikit-learn must load before eventlet patches standard library I/O.
