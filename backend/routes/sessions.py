"""Session CRUD routes + monitor start/stop."""

import logging
import time

from flask import Blueprint, request, jsonify

from extensions import socketio
from state import (
    rooms, session_summaries, transcripts,
    chat_messages, raised_hands, monitored_sessions,
    waiting_room,
)
from models.session import create_session, get_session, end_session as db_end_session
from models.analytics import write_analytics
from utils import build_summary

logger = logging.getLogger(__name__)

sessions_bp = Blueprint("sessions", __name__)


@sessions_bp.route("/session", methods=["POST"])
def create():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "Speaker").strip()
    meeting_name = (body.get("meetingName") or "").strip()
    lobby_enabled = body.get("lobbyEnabled", True)
    session_id = create_session(name, lobby_enabled=lobby_enabled, meeting_name=meeting_name)
    logger.info("session created  %s", session_id)
    return jsonify({"sessionId": session_id})


@sessions_bp.route("/session/<session_id>", methods=["GET"])
def validate(session_id):
    s = get_session(session_id)
    if not s:
        return jsonify({"error": "Session not found"}), 404
    if s.get("endedAt"):
        return jsonify({"error": "Session has ended"}), 410
    s.pop("_id", None)
    return jsonify(s)


@sessions_bp.route("/session/<session_id>/end", methods=["PATCH"])
def end(session_id):
    s = get_session(session_id)
    if not s:
        return jsonify({"error": "Session not found"}), 404

    db_end_session(session_id)

    if session_id in monitored_sessions:
        write_analytics(session_id)
        monitored_sessions.discard(session_id)

    summary = build_summary(session_id, s)
    socketio.emit("sessionEnded", {"summary": summary}, room=session_id)
    logger.info("session ended    %s", session_id)

    session_summaries.pop(session_id, None)
    transcripts.pop(session_id, None)
    chat_messages.pop(session_id, None)
    raised_hands.pop(session_id, None)
    waiting_room.pop(session_id, None)

    return jsonify({"ok": True, "summary": summary})


@sessions_bp.route("/session/<session_id>/summary", methods=["GET"])
def summary(session_id):
    ss = session_summaries.get(session_id)
    if not ss:
        return jsonify({"error": "No summary available"}), 404
    s = get_session(session_id) or {}
    return jsonify(build_summary(session_id, s) or {"error": "No data"})


@sessions_bp.route("/session/<session_id>/monitor", methods=["POST"])
def start_monitor(session_id):
    s = get_session(session_id)
    if not s:
        return jsonify({"error": "Session not found"}), 404
    monitored_sessions.add(session_id)
    if session_id not in session_summaries:
        session_summaries[session_id] = {
            "start_time": s.get("createdAt", int(time.time() * 1000)),
            "participants": {},
        }
    write_analytics(session_id)
    socketio.emit("monitoring_started", {"meetingId": session_id}, room=session_id)
    logger.info("monitor started   %s", session_id)
    return jsonify({"ok": True})


@sessions_bp.route("/session/<session_id>/stop-monitor", methods=["POST"])
def stop_monitor(session_id):
    s = get_session(session_id)
    if not s:
        return jsonify({"error": "Session not found"}), 404
    if session_id in monitored_sessions:
        write_analytics(session_id)
        monitored_sessions.discard(session_id)
    socketio.emit("monitoring_stopped", {"meetingId": session_id}, room=session_id)
    logger.info("monitor stopped   %s", session_id)
    return jsonify({"ok": True})
