"""
EngageAI — Centralised configuration.
All environment variables, thresholds, and constants live here.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── Server ────────────────────────────────────────────────────
PORT = int(os.environ.get("PORT", 5000))

# ── CORS ─────────────────────────────────────────────────────
# Set CORS_ENABLED=true to restrict origins; provide comma-separated list.
# Default: disabled (allow all origins).
CORS_ENABLED = os.environ.get("CORS_ENABLED", "false").lower() == "true"
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")  # e.g. "https://my-fe.onrender.com,http://localhost:3000"

# ── MongoDB ───────────────────────────────────────────────────
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/EngageAI")

# ── Admin credentials ─────────────────────────────────────────
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "engageai")

# ── JWT ──────────────────────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET", "engageai-secret-change-me")
JWT_EXPIRY_HOURS = int(os.environ.get("JWT_EXPIRY_HOURS", 24))

# ── ML thresholds ─────────────────────────────────────────────
EAR_BLINK_THRESHOLD = 0.21
PERCLOS_WINDOW = 30          # frames
LOW_ENGAGEMENT_THRESHOLD = 40
DROWSINESS_ALERT_THRESHOLD = 0.5
DROWSINESS_INCREMENT_THRESHOLD = 0.4
AUDIO_SPEAKING_THRESHOLD = 15
BLINK_RATE_NORMALIZE = 30.0  # 30 bpm = 1.0

# ── Emotion / attention labels ────────────────────────────────
ALL_EMOTIONS = [
    "happy", "sad", "neutral", "surprised", "angry",
    "fearful", "disgusted", "focused", "confused",
]
ALL_ATTENTION_STATES = ["focused", "distracted", "drowsy", "away"]
