# EngageAI — Real-Time Meeting Engagement Detection System

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Flask](https://img.shields.io/badge/Flask-3.1-000000?logo=flask)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Face_Mesh-4285F4?logo=google)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

A full-stack AI-powered meeting platform that analyses participant engagement in real-time using computer vision, facial landmark detection, and machine learning. Built with Python (Flask + MediaPipe + scikit-learn) and React.

> **Final Year B.Tech AIML Project** — Real-time engagement detection for online meetings using facial analysis and ML-based scoring.

---

## Features

### Meeting Platform
- Video conferencing with WebRTC (peer-to-peer mesh)
- Screen sharing, whiteboard, group chat & direct messaging
- Raise hand, emoji reactions, live transcript (Web Speech API)
- Admin login with dashboard for all past/active meetings
- Privacy consent modal before joining

### ML-Powered Analysis
- **478-point facial landmark detection** using MediaPipe FaceLandmarker
- **Engagement scoring** via GradientBoosting regressor (5000 training samples, 10 features)
- **9 emotion states**: happy, sad, neutral, surprised, angry, fearful, disgusted, focused, confused — with confidence scores
- **4 attention states**: focused, distracted, drowsy, away
- **Gaze detection** using iris landmarks (468-477)
- **Drowsiness detection** via PERCLOS metric (eye-closure ratio over sliding window)
- **Blink rate tracking** from EAR transitions
- **Head movement velocity** for fidgeting/stillness detection
- **Facial symmetry analysis** for micro-expression cues
- **Audio analysis**: speech pace and vocal energy classification

### Analytics & Reporting
- Real-time monitor view with live engagement charts
- Per-participant engagement scores, emotion timelines, attention distribution
- Talk time, away time, visible/listening time tracking
- Drowsiness alerts and attention state badges on video tiles
- End-of-meeting summary with full participant breakdown
- Dashboard with all past meetings and their analytics
- All data persisted to MongoDB

---

## Screenshots

<!-- Add screenshots of each view here -->
<!-- ![Home Page](docs/screenshots/home.png) -->
<!-- ![Meeting Room](docs/screenshots/meeting.png) -->
<!-- ![Monitor View](docs/screenshots/monitor.png) -->
<!-- ![Dashboard](docs/screenshots/dashboard.png) -->

---

## Research Background

This project builds on established research in facial analysis and engagement detection:

| Technique | Foundation | Reference |
|-----------|-----------|-----------|
| **Eye Aspect Ratio (EAR)** | Blink detection from eye landmark ratios | Soukupova & Cech (2016) |
| **PERCLOS** | Drowsiness metric — percentage of eye closure over time | Dinges & Grace (1998) |
| **Facial Action Coding System** | Emotion classification from facial muscle movements | Ekman & Friesen (1978) |
| **MediaPipe Face Mesh** | Real-time 478-point 3D face landmark detection | Kartynnik et al. (2019), Google |
| **GradientBoosting** | Ensemble regression for engagement scoring | Friedman (2001) |

### ML Pipeline

```
Camera Frame (JPEG) ──> Socket.IO ──> Backend ML Pipeline
                                           │
                                           ▼
                                 MediaPipe FaceLandmarker
                                 (478 facial landmarks + iris)
                                           │
                       ┌───────────────────┼───────────────────┐
                       ▼                   ▼                   ▼
                 Feature Extraction   Iris Landmarks      Audio Analysis
                 - EAR (eye open)     - Gaze score        - Speech pace
                 - MAR (mouth open)   (landmarks 468-477) - Vocal energy
                 - Smile ratio
                 - Brow raise
                 - Head yaw/pitch
                 - Facial symmetry
                 - Blink rate
                 - Head velocity
                       │                   │                   │
                       └───────────────────┼───────────────────┘
                                           ▼
                          ┌────────────────────────────────┐
                          │  GradientBoosting Regressor    │
                          │  (120 trees, 10 features)      │
                          │  → Engagement Score 0-100      │
                          ├────────────────────────────────┤
                          │  Emotion Classifier (9 states) │
                          │  → emotion + confidence        │
                          ├────────────────────────────────┤
                          │  Attention Classifier          │
                          │  → focused/distracted/         │
                          │    drowsy/away                 │
                          └────────────────────────────────┘
                                           │
                                           ▼
                              Results → Frontend + MongoDB
```

### Engagement Model Features

| Feature | Description | Weight Direction |
|---------|-------------|-----------------|
| Face detected | Binary: is a face visible? | + engagement |
| EAR | Eye Aspect Ratio (eye openness) | + engagement |
| Smile ratio | Lip corner lift measurement | + engagement |
| Head yaw | Horizontal head rotation | - engagement |
| Head pitch | Vertical head tilt | - engagement |
| Audio level | Normalised vocal energy | + engagement |
| Gaze score | Iris position relative to eye centre | + engagement |
| Blink rate | Normalised blinks per minute | Optimal at midpoint |
| Head velocity | Head movement speed | - engagement |
| Drowsiness | PERCLOS drowsiness score | - engagement |

---

## Architecture

```
EngageAI/
├── backend/                     # Python Flask + Flask-SocketIO
│   ├── app.py                   # Slim entrypoint (~45 lines)
│   ├── config.py                # Environment vars & thresholds
│   ├── extensions.py            # Flask, SocketIO, MongoDB init
│   ├── state.py                 # In-memory room state
│   ├── validators.py            # Input validation
│   ├── utils.py                 # Shared helpers
│   ├── ml/                      # ML Pipeline
│   │   ├── analyzer.py          # FaceAnalyzer orchestrator
│   │   ├── feature_extraction.py # Geometric features
│   │   ├── classifiers.py       # Emotion & attention classifiers
│   │   ├── engagement_model.py  # GradientBoosting model
│   │   ├── state_trackers.py    # Blink, head, audio trackers
│   │   └── constants.py         # Landmark indices
│   ├── models/                  # MongoDB data access
│   ├── routes/                  # REST API blueprints
│   ├── sockets/                 # Socket.IO event handlers
│   ├── tests/                   # pytest test suite
│   ├── docs/                    # Backend documentation
│   ├── face_landmarker.task     # MediaPipe model file
│   └── requirements.txt
├── frontend/                    # React 18 + Vite
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── common/          # ErrorBoundary, LoadingSpinner
│   │   │   ├── home/            # Home, AdminPanel, JoinForm
│   │   │   └── meeting/         # MeetingRoom, Header, Summary
│   │   ├── hooks/               # Custom React hooks
│   │   ├── utils/               # Shared utilities
│   │   └── styles/              # Modular CSS (10 files)
│   ├── docs/                    # Frontend documentation
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## Prerequisites

- **Python 3.10+** (3.10 or 3.11 recommended)
- **Node.js 18+** and npm
- **MongoDB** (Atlas cloud or local instance)
- **Webcam + Microphone**
- **Chrome or Edge** browser (WebRTC + Web Speech API)

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/scripts/activate        # Linux/macOS
# venv\Scripts\activate          # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and admin credentials

# Run
python app.py
```

Expected output:
```
[ML] Engagement model trained (5000 samples, GradientBoosting 120 trees)
[ML] FaceAnalyzer v6 ready (MediaPipe + GradientBoosting + Gaze + Attention)
[DB] MongoDB connected
EngageAI backend v6 http://0.0.0.0:5000
ML engine           ACTIVE
```

### 2. Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

Access at **https://localhost:3000** (accept the self-signed certificate warning).

### 3. Using the Application

1. Open `https://localhost:3000` in Chrome/Edge
2. **Admin Login** → enter credentials (default: admin / engageai)
3. **Create Meeting** → enter your name, click "Start New Meeting"
4. **Share link** → copy the invite URL from the meeting header
5. **Start Analysis** → host clicks "Analysis" button in toolbar
6. **Monitor** → host clicks "Monitor" to view live analytics
7. **End Meeting** → summary modal appears with full breakdown
8. **Dashboard** → review all past meetings with analytics

### For LAN Access

The invite URL uses your machine's LAN IP automatically:
```
https://<your-lan-ip>:3000?join=<MEETING_ID>
```

---

## Running Tests

### Backend (pytest)

```bash
cd backend
pip install pytest pytest-cov
pytest -v
pytest --cov=. --cov-report=html   # with coverage
```

### Frontend (vitest)

```bash
cd frontend
npm install
npm test                # single run
npm run test:watch      # watch mode
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Recharts, Socket.IO Client |
| **Backend** | Python Flask, Flask-SocketIO, eventlet |
| **ML Engine** | MediaPipe FaceLandmarker, scikit-learn GradientBoosting |
| **Computer Vision** | OpenCV, NumPy, Pillow |
| **Database** | MongoDB (pymongo) |
| **Real-time** | Socket.IO (WebSocket + polling fallback) |
| **Video** | WebRTC (peer-to-peer mesh) |
| **Speech** | Web Speech API (Chrome/Edge built-in) |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/login` | Admin authentication |
| GET | `/network-info` | Server LAN IP + ML status |
| POST | `/session` | Create new meeting session |
| GET | `/session/:id` | Validate session exists |
| PATCH | `/session/:id/end` | End session + generate summary |
| POST | `/session/:id/monitor` | Start ML analysis |
| POST | `/session/:id/stop-monitor` | Stop ML analysis |
| GET | `/meetings` | List all meetings |
| GET | `/meetings/:id/analytics` | Full analytics data |
| POST | `/feedback` | Submit participant feedback |
| GET | `/feedback/:id` | Get feedback for meeting |

See [backend/docs/API_REFERENCE.md](backend/docs/API_REFERENCE.md) for full Socket.IO event documentation.

---

## Results & Evaluation

### Engagement Model Performance
- **Model**: GradientBoostingRegressor with 120 estimators, max_depth=6
- **Training**: 5,000 synthetic samples with realistic feature distributions
- **Features**: 10-dimensional feature vector (face, eyes, mouth, gaze, head, audio, drowsiness)
- **Output**: Continuous engagement score 0-100, clamped and rounded

### Emotion Classification
- **Method**: Rule-based weighted scoring with multi-signal fusion
- **States**: 9 emotions with confidence scores
- **Inputs**: EAR, MAR, smile ratio, brow raise, gaze score, audio level

### Attention Tracking
- **Method**: Hierarchical rule-based classifier
- **States**: Focused, Distracted, Drowsy, Away
- **Key metrics**: Gaze score, head pose (yaw/pitch), PERCLOS drowsiness, blink rate

### System Performance
- Frame processing: ~50-100ms per frame (backend ML pipeline)
- Frame capture rate: ~2 FPS (configurable)
- Supports multiple simultaneous participants
- All processing on local network — no cloud dependency

---

## Future Work

- [ ] Train engagement model on real annotated data (classroom/meeting recordings)
- [ ] Add deep learning-based emotion recognition (CNN/transformer)
- [ ] Implement SFU (Selective Forwarding Unit) for better scalability beyond 6 participants
- [ ] Add engagement prediction (forecast disengagement before it happens)
- [ ] Mobile app support (React Native)
- [ ] Multi-language transcript support
- [ ] Export analytics as PDF reports
- [ ] Integration with LMS (Learning Management Systems) for classroom use

---

## Documentation

### Backend
- [Architecture](backend/docs/ARCHITECTURE.md) — System design and data flow
- [ML Pipeline](backend/docs/ML_PIPELINE.md) — Feature engineering, classifiers, and model details
- [API Reference](backend/docs/API_REFERENCE.md) — REST endpoints and Socket.IO events
- [Deployment](backend/docs/DEPLOYMENT.md) — Setup, Docker, and troubleshooting

### Frontend
- [Component Architecture](frontend/docs/COMPONENT_ARCHITECTURE.md) — Component tree and data flow
- [Hooks Guide](frontend/docs/HOOKS_GUIDE.md) — Custom React hooks documentation
- [Styling Guide](frontend/docs/STYLING_GUIDE.md) — CSS architecture and conventions

---

## Key Design Decisions

- **ML runs server-side only** — frontend captures frames (JPEG at ~2fps) and sends via Socket.IO; all ML processing happens on the backend
- **Critical import order** — ML must be imported before `eventlet.monkey_patch()` to prevent MediaPipe/sklearn breakage
- **Privacy-first** — no raw video/audio is stored; only computed metrics persist to MongoDB
- **Modular architecture** — backend split into routes, sockets, models, and ml packages; frontend split into components, hooks, utils, and styles

---

## Contributors

- **Harshith Korandla** — Full-stack development, ML pipeline, system architecture

---

## License

This project is developed as an academic project for educational purposes.
