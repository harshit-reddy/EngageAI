# EngageAI — Real-Time Engagement Detection System

A real-time engagement detection system for meetings and presentations. The host sees live analytics (emotions, engagement scores, audio analysis, graphs, and alerts) while participants simply join via a link and have their video on — no metrics shown on their screen.

## Team

| Member | Role |
|--------|------|
| Member 1 | Frontend Development |
| Member 2 | Backend Development |
| Member 3 | AI/ML Integration (face-api.js, Audio Analysis) |
| Member 4 | Testing, Docker, Documentation |

## Features

- **Real-time emotion detection** using face-api.js (happy, sad, angry, surprised, neutral, etc.)
- **Audio analysis** — speech pace (silent/slow/moderate/fast) and vocal energy detection
- **Engagement scoring** — weighted algorithm combining face presence (40%), expression (35%), and audio (25%)
- **Live dashboard for host** — participant tiles, engagement meter, trend chart, distribution chart
- **Alerts** — automatic notification when overall engagement drops below 40%
- **Private feedback** — participants can send anonymous feedback to the host
- **Session summary** — per-participant breakdown with average engagement and dominant emotion
- **LAN support** — participants join from other laptops on the same Wi-Fi via share link
- **No recording** — only computed metrics are transmitted, no raw video/audio stored

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, face-api.js, Recharts, Socket.IO Client |
| Backend | Node.js, Express, Socket.IO |
| AI Models | TinyFaceDetector, FaceExpressionNet (via face-api.js) |
| Containerization | Docker |
| Styling | Custom CSS (dark theme) |

## Architecture

```
Host Browser                    Backend (Port 4000)              Participant Browser
+-----------------+             +------------------+             +------------------+
| SpeakerDashboard| <--socket-- | Express +        | --socket--> | ParticipantView  |
| - Participant   |             | Socket.IO Server |             | - Video only     |
|   tiles         |             |                  |             | - Background     |
| - Engagement    | REST API    | REST API:        |  REST API   |   analysis       |
|   charts        | ----------> | POST /session    | <---------- | - Send feedback  |
| - Alerts        |             | GET  /session/:id|             |                  |
| - Feedback feed |             | PATCH /end       |             |                  |
| - Summary modal |             | POST /feedback   |             |                  |
+-----------------+             +------------------+             +------------------+
```

## Project Structure

```
EngageAI/
├── backend/
│   ├── server.js            # Express + Socket.IO server
│   ├── package.json
│   ├── Dockerfile
│   └── db.json              # Session/feedback storage (auto-generated)
├── frontend/
│   ├── src/
│   │   ├── App.js           # View routing (Home/Speaker/Participant)
│   │   ├── api.js           # Dynamic server URL (LAN support)
│   │   └── components/
│   │       ├── Home.jsx             # Landing page (Start/Join meeting)
│   │       ├── SpeakerDashboard.jsx # Host analytics dashboard
│   │       ├── ParticipantView.jsx  # Participant video + background analysis
│   │       ├── ParticipantTile.jsx  # Individual engagement card
│   │       ├── TrendChart.jsx       # Engagement line chart
│   │       └── DistributionChart.jsx# Engagement bar chart
│   ├── public/
│   │   └── models/          # face-api.js AI models (downloaded)
│   ├── scripts/
│   │   └── download-models.sh
│   ├── nginx.conf
│   ├── package.json
│   └── Dockerfile
├── commands.txt             # Quick reference for all run commands
├── .gitignore
└── README.md
```

## Prerequisites

- **Node.js 18+** and **npm** (for local run)
- **Docker** (for containerized run)
- **Google Chrome** (recommended browser)
- All laptops on the **same Wi-Fi network**

## Setup & Run

### Option 1: Run Locally

**Find your IP address first** (needed for participants to connect):
```bash
# Windows
ipconfig
# Look for IPv4 Address under Wi-Fi (e.g. 192.168.1.5)
```

**Start the backend:**
```bash
cd backend
npm install
node server.js
# Runs on http://localhost:4000
```

**Download AI models (one time only) and start the frontend:**
```bash
cd frontend
npm install
mkdir -p public/models
bash scripts/download-models.sh
npm start
# Runs on http://localhost:3000
```

### Option 2: Run with Docker

```bash
# Build and run backend
cd backend
docker build -t engageai-backend .
docker run -d --name engageai-backend -p 4000:4000 engageai-backend

# Build and run frontend
cd frontend
docker build -t engageai-frontend .
docker run -d --name engageai-frontend -p 3000:80 engageai-frontend
```

**Stop and remove containers:**
```bash
docker stop engageai-frontend engageai-backend
docker rm engageai-frontend engageai-backend
```

## How to Use

### Host (Presenter Laptop)

1. Open `http://localhost:3000` in Chrome
2. Click **"Start Meeting"** tab
3. Enter your name → click **Start Meeting**
4. Copy the **share link** shown at the top and send it to participants
5. The dashboard shows:
   - Live participant tiles with engagement %, detected emotion, speech pace
   - Overall engagement meter (0–100%)
   - Engagement trend chart (line graph over last 60 seconds)
   - Engagement distribution chart (High / Medium / Low)
   - Yellow alerts when engagement drops below 40%
   - Private feedback from participants
6. Click **"End Session"** to see the full session summary

### Participant (Other Laptops)

1. Receive the share link from the host (e.g. `http://192.168.1.5:3000?join=A3F1C2`)
2. Open the link in Chrome
3. Enter your name → click **Join Meeting**
4. Allow camera and microphone permissions when prompted
5. You see **only your video feed** — no analytics or metrics on your screen
6. Optionally send private feedback to the host
7. Click **"Leave Meeting"** when done

## How It Works

1. **Participant's browser** loads face-api.js models and accesses camera + microphone
2. Every 700ms, the browser computes:
   - **Face detection** — is a face visible? (40% weight)
   - **Emotion recognition** — happy, neutral, sad, angry, etc. (35% weight)
   - **Audio analysis** — volume level, speech pace via zero-crossing rate (25% weight)
3. These metrics are sent to the backend via **Socket.IO** (no video/audio transmitted)
4. The backend forwards metrics to the **host's dashboard** in real-time
5. The host sees live graphs, per-participant engagement tiles, and alerts
6. When the session ends, a **summary** is computed with averages per participant

## Engagement Score Formula

```
Score = (faceWeight * 40) + (expressionWeight * 35) + (audioWeight * 25)

Expression weights:
  Happy = 1.0 | Surprised = 0.8 | Neutral = 0.7
  Fearful = 0.4 | Sad = 0.3 | Angry = 0.3 | Disgusted = 0.2

Audio: Normalized frequency magnitude (0–1)
```

## Notes

- **Privacy**: No video or audio is recorded or stored — only computed numerical metrics are transmitted
- **LAN only**: Designed for same-network use (not deployed to the internet)
- **Browser**: Google Chrome recommended for WebRTC camera/mic access
- **CORS**: Open (`origin: *`) since this is a local/LAN-only application
