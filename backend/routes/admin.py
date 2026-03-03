"""Admin authentication route."""

from flask import Blueprint, request, jsonify
from config import ADMIN_USER, ADMIN_PASS

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/admin/login", methods=["POST"])
def admin_login():
    body = request.get_json(silent=True) or {}
    user = body.get("username", "")
    pw = body.get("password", "")
    if user == ADMIN_USER and pw == ADMIN_PASS:
        return jsonify({"ok": True})
    return jsonify({"ok": False, "error": "Invalid credentials"}), 401
