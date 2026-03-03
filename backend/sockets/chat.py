"""Chat message and direct message handlers."""

import time
import uuid

from flask import request
from flask_socketio import emit

from state import chat_messages


def register(socketio):

    @socketio.on("chat_message")
    def on_chat_message(data):
        if not data:
            return
        meeting_id = data.get("meetingId")
        text = data.get("text")
        if not meeting_id or not text:
            return
        msg = {
            "id": uuid.uuid4().hex[:8],
            "name": data.get("name") or "Unknown",
            "text": text.strip(),
            "ts": int(time.time() * 1000),
        }
        chat_messages.setdefault(meeting_id, []).append(msg)
        socketio.emit("chat_message", msg, room=meeting_id)

    @socketio.on("direct_message")
    def on_direct_message(data):
        if not data:
            return
        target_sid = data.get("to")
        text = (data.get("text") or "").strip()
        if not target_sid or not text:
            return
        msg = {
            "id": uuid.uuid4().hex[:8],
            "fromName": data.get("name") or "Unknown",
            "fromSid": request.sid,
            "toSid": target_sid,
            "text": text,
            "ts": int(time.time() * 1000),
        }
        socketio.emit("direct_message", msg, room=target_sid)
        emit("direct_message", msg)
