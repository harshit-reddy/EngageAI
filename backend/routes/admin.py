"""Admin authentication with JWT."""

import logging
from datetime import datetime, timezone, timedelta
from functools import wraps

import jwt
from flask import Blueprint, request, jsonify, g

from config import ADMIN_USER, ADMIN_PASS, JWT_SECRET, JWT_EXPIRY_HOURS

logger = logging.getLogger(__name__)

admin_bp = Blueprint("admin", __name__)


def _make_token():
    payload = {
        "sub": ADMIN_USER,
        "role": "admin",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def admin_required(fn):
    """Decorator — require valid admin JWT in Authorization header."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        token = auth.replace("Bearer ", "") if auth.startswith("Bearer ") else ""
        if not token:
            return jsonify({"error": "Authentication required"}), 401
        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            g.admin_user = data.get("sub")
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired, please login again"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return fn(*args, **kwargs)
    return wrapper


@admin_bp.route("/admin/login", methods=["POST"])
def admin_login():
    """Admin login — returns JWT token
    ---
    tags:
      - Auth
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [username, password]
          properties:
            username: { type: string, example: admin }
            password: { type: string, example: engageai }
    responses:
      200:
        description: Login successful
        schema:
          type: object
          properties:
            ok: { type: boolean }
            token: { type: string }
            user: { type: string }
      401:
        description: Invalid credentials
    """
    body = request.get_json(silent=True) or {}
    user = body.get("username", "")
    pw = body.get("password", "")
    if user == ADMIN_USER and pw == ADMIN_PASS:
        token = _make_token()
        logger.info("admin login OK — %s", user)
        return jsonify({"ok": True, "token": token, "user": user})
    return jsonify({"ok": False, "error": "Invalid credentials"}), 401


@admin_bp.route("/admin/verify", methods=["GET"])
@admin_required
def verify_token():
    """Verify admin JWT token
    ---
    tags:
      - Auth
    security:
      - Bearer: []
    responses:
      200:
        description: Token is valid
        schema:
          type: object
          properties:
            ok: { type: boolean }
            user: { type: string }
      401:
        description: Token expired or invalid
    """
    return jsonify({"ok": True, "user": g.admin_user})
