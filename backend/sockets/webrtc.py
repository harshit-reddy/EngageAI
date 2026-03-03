"""WebRTC signaling handlers."""

from flask import request
from flask_socketio import emit

from state import socket_data


def register(socketio):

    @socketio.on("rtc_ready")
    def on_rtc_ready(data):
        if not data:
            return
        meeting_id = data.get("meetingId")
        name = data.get("name")
        if not meeting_id:
            return
        emit("rtc_peer_joined", {"peerId": request.sid, "name": name or "?"},
             room=meeting_id, include_self=False)

    @socketio.on("rtc_offer")
    def on_rtc_offer(data):
        if not data:
            return
        to = data.get("to")
        if not to:
            return
        sd = socket_data.get(request.sid, {})
        emit("rtc_offer", {
            "from": request.sid,
            "offer": data.get("offer"),
            "name": sd.get("name", "?"),
        }, room=to)

    @socketio.on("rtc_answer")
    def on_rtc_answer(data):
        if not data:
            return
        to = data.get("to")
        if not to:
            return
        emit("rtc_answer", {
            "from": request.sid,
            "answer": data.get("answer"),
        }, room=to)

    @socketio.on("rtc_ice")
    def on_rtc_ice(data):
        if not data:
            return
        to = data.get("to")
        if not to:
            return
        emit("rtc_ice", {
            "from": request.sid,
            "candidate": data.get("candidate"),
        }, room=to)
