"""Reaction, raise-hand, mute controls."""

import time

from flask import request
from flask_socketio import emit

from state import raised_hands


def register(socketio):

    @socketio.on("reaction")
    def on_reaction(data):
        if not data:
            return
        meeting_id = data.get("meetingId")
        if not meeting_id:
            return
        socketio.emit("reaction", {
            "name": data.get("name", "?"),
            "emoji": data.get("emoji", ""),
            "ts": int(time.time() * 1000),
        }, room=meeting_id)

    @socketio.on("raise_hand")
    def on_raise_hand(data):
        if not data:
            return
        meeting_id = data.get("meetingId")
        raised = data.get("raised", False)
        if not meeting_id:
            return

        sid = request.sid
        if meeting_id not in raised_hands:
            raised_hands[meeting_id] = set()

        if raised:
            raised_hands[meeting_id].add(sid)
        else:
            raised_hands[meeting_id].discard(sid)

        socketio.emit("hand_raised", {
            "peerId": sid,
            "name": data.get("name", "?"),
            "raised": raised,
        }, room=meeting_id)

    @socketio.on("mute_all")
    def on_mute_all(data):
        if not data:
            return
        meeting_id = data.get("meetingId")
        if not meeting_id:
            return
        emit("force_mute", {}, room=meeting_id, include_self=False)

    @socketio.on("mute_participant")
    def on_mute_participant(data):
        if not data:
            return
        target_sid = data.get("peerId")
        if target_sid:
            socketio.emit("force_mute", {}, room=target_sid)
