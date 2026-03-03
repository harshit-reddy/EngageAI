"""
EngageAI v6 — Flask + Flask-SocketIO backend
Port 5000 | eventlet async mode
Slim entrypoint: ML load -> monkey_patch -> register routes & sockets -> run
"""

# ─── ML analyzer — must load BEFORE eventlet.monkey_patch() ──────
ML_AVAILABLE = False
analyzer = None
try:
    from ml.analyzer import FaceAnalyzer
    analyzer = FaceAnalyzer()
    ML_AVAILABLE = True
except Exception as e:
    # logging not yet configured; these will be re-logged below
    _ml_init_error = e

import eventlet
eventlet.monkey_patch()

# ─── Centralised logging setup ───────────────────────────────────
import logging
from logging.handlers import RotatingFileHandler

LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
LOG_FILE = "engageai.log"
LOG_MAX_BYTES = 5 * 1024 * 1024  # 5 MB
LOG_BACKUP_COUNT = 3

root_logger = logging.getLogger()
root_logger.setLevel(logging.DEBUG)

file_handler = RotatingFileHandler(
    LOG_FILE, maxBytes=LOG_MAX_BYTES, backupCount=LOG_BACKUP_COUNT
)
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
root_logger.addHandler(file_handler)

console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)
console_handler.setFormatter(logging.Formatter(LOG_FORMAT))
root_logger.addHandler(console_handler)

logger = logging.getLogger(__name__)

# Log deferred ML init result
if not ML_AVAILABLE:
    logger.warning("ML analyzer unavailable: %s", _ml_init_error)
    logger.warning("Install deps:  pip install mediapipe opencv-python-headless numpy scikit-learn Pillow")

from config import PORT, MONGO_URI
from extensions import app, socketio
from routes import register_routes
from routes.network import network_bp
from sockets import register_sockets
from utils import get_local_ip

# Tell the network route whether ML is active
network_bp.ML_AVAILABLE = ML_AVAILABLE
import routes.network as _net_mod
_net_mod.ML_AVAILABLE = ML_AVAILABLE

# Wire everything up
register_routes(app)
register_sockets(socketio, analyzer)

if __name__ == "__main__":
    ip = get_local_ip()
    logger.info("EngageAI backend v6 http://0.0.0.0:%s", PORT)
    logger.info("LAN address         http://%s:%s", ip, PORT)
    logger.info("ML engine           %s", "ACTIVE" if ML_AVAILABLE else "UNAVAILABLE")
    logger.info("MongoDB             %s", MONGO_URI)
    try:
        socketio.run(app, host="0.0.0.0", port=PORT)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
