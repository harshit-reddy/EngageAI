"""Media status, audio activity, and screen share handlers."""

from flask import request
from flask_socketio import emit

from state import rooms


def register(socketio):

    @socketio.on("media_status")
    def on_media_status(data):
        if not data:
            return
        meeting_id = data.get("meetingId")
        if not meeting_id:
            return
        sid = request.sid
        p = rooms.get(meeting_id, {}).get(sid)
        if p:
            p["isMuted"] = data.get("isMuted", False)
            p["isVideoOff"] = data.get("isVideoOff", False)
        socketio.emit("media_status", {
            "peerId": sid,
            "isMuted": data.get("isMuted", False),
            "isVideoOff": data.get("isVideoOff", False),
        }, room=meeting_id)

    @socketio.on("audio_activity")
    def on_audio_activity(data):
        if not data:
            return
        meeting_id = data.get("meetingId")
        if not meeting_id:
            return
        socketio.emit("audio_activity", {
            "peerId": request.sid,
            "isSpeaking": data.get("isSpeaking", False),
        }, room=meeting_id)

    @socketio.on("screen_share_started")
    def on_screen_share_started(data):
        if not data:
            return
        meeting_id = data.get("meetingId")
        if meeting_id:
            emit("screen_share_started", {"peerId": request.sid},
                 room=meeting_id, include_self=False)

    @socketio.on("screen_share_stopped")
    def on_screen_share_stopped(data):
        if not data:
            return
        meeting_id = data.get("meetingId")
        if meeting_id:
            emit("screen_share_stopped", {"peerId": request.sid},
                 room=meeting_id, include_self=False)
