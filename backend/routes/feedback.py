"""Feedback submission & retrieval routes."""

from flask import Blueprint, request, jsonify

from extensions import socketio
from models.feedback import save_feedback, get_feedback as db_get_feedback

feedback_bp = Blueprint("feedback", __name__)


@feedback_bp.route("/feedback", methods=["POST"])
def submit_feedback():
    body = request.get_json(silent=True) or {}
    meeting_id = body.get("meetingId")
    message = body.get("message")
    if not meeting_id or not message:
        return jsonify({"error": "meetingId and message are required"}), 400

    from_name = body.get("from") or "Anonymous"
    emit_item = save_feedback(meeting_id, from_name, message)
    socketio.emit("newFeedback", emit_item, room=f"speaker:{meeting_id}")
    return jsonify({"ok": True, "item": emit_item})


@feedback_bp.route("/feedback/<meeting_id>", methods=["GET"])
def get_feedback(meeting_id):
    fb = db_get_feedback(meeting_id)
    return jsonify({"feedback": fb})
