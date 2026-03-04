"""
EngageAI — Flask app, SocketIO, and MongoDB initialisation.
"""

import logging

from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from pymongo import MongoClient

from config import MONGO_URI, CORS_ENABLED, CORS_ORIGINS

logger = logging.getLogger(__name__)

# ── Resolve CORS origins ────────────────────────────────────────
if not CORS_ENABLED:
    _origins = "*"
else:
    _origins = [o.strip() for o in CORS_ORIGINS.split(",") if o.strip()] or "*"

# ── Flask ─────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": _origins}})

# ── SocketIO ──────────────────────────────────────────────────
socketio = SocketIO(
    app,
    cors_allowed_origins=_origins,
    async_mode="eventlet",
    ping_timeout=60,
    max_http_buffer_size=2_000_000,
)

# ── MongoDB ───────────────────────────────────────────────────
mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = mongo_client.get_default_database(default="EngageAI")

sessions_col = db["sessions"]
analytics_col = db["analytics"]
feedback_col = db["feedback"]

try:
    mongo_client.admin.command("ping")
    logger.info("MongoDB connected  (%s)", MONGO_URI)
except Exception as e:
    logger.warning("MongoDB connection failed: %s", e)
    logger.warning("Make sure mongod is running. Data will not persist.")
