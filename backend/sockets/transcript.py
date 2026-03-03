"""Transcript line handler."""

import time

from state import transcripts


def register(socketio):

    @socketio.on("transcript_line")
    def on_transcript_line(data):
        if not data:
            return
        meeting_id = data.get("meetingId")
        text = data.get("text")
        if not meeting_id or not text:
            return
        line = {
            "name": data.get("name") or "Unknown",
            "text": text,
            "ts": int(time.time() * 1000),
        }
        transcripts.setdefault(meeting_id, []).append(line)
        socketio.emit("transcript_line", line, room=meeting_id)
