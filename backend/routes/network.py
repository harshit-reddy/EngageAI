"""Network info & health check routes."""

from flask import Blueprint, jsonify
from utils import get_local_ip

network_bp = Blueprint("network", __name__)

# This will be set by app.py after ML import
ML_AVAILABLE = False


@network_bp.route("/")
def index():
    """Health check
    ---
    tags: [System]
    responses:
      200: { description: Backend is running }
    """
    return "EngageAI backend running (v6)"


@network_bp.route("/network-info")
def network_info():
    """Get server network info and ML engine status
    ---
    tags: [System]
    responses:
      200:
        description: Network info
        schema:
          type: object
          properties:
            ip: { type: string }
            port: { type: integer }
            ml: { type: boolean }
    """
    return jsonify({"ip": get_local_ip(), "port": 5000, "ml": ML_AVAILABLE})
