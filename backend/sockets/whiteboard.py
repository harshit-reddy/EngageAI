"""Whiteboard draw & clear handlers."""

from flask_socketio import emit


def register(socketio):

    @socketio.on("whiteboard_draw")
    def on_whiteboard_draw(data):
        if not data:
            return
        meeting_id = data.get("meetingId")
        if meeting_id:
            emit("whiteboard_draw", data, room=meeting_id, include_self=False)

    @socketio.on("whiteboard_clear")
    def on_whiteboard_clear(data):
        if not data:
            return
        meeting_id = data.get("meetingId")
        if meeting_id:
            emit("whiteboard_clear", {}, room=meeting_id, include_self=False)
