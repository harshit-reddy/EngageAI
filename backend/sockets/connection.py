"""Socket.IO connect, join, disconnect handlers."""

import logging

from flask import request
from flask_socketio import join_room, emit

from state import (
    rooms, socket_data, raised_hands,
    session_summaries, monitored_sessions,
)
from utils import room_snapshot

logger = logging.getLogger(__name__)


def register(socketio):

    @socketio.on("connect")
    def on_connect():
        logger.info("socket connect    %s", request.sid)

    @socketio.on("join")
    def on_join(data):
        if not data:
            return
        meeting_id = data.get("meetingId")
        role = data.get("role")
        name = data.get("name")
        if not meeting_id or not role or not name:
            return

        sid = request.sid

        # Check if lobby is enabled for audience
        if role == 'audience':
            from models.session import get_session
            session = get_session(meeting_id)
            if session and session.get('lobbyEnabled', True):
                # Don't join the room yet — put in waiting room
                from state import waiting_room
                import time as _time
                socket_data[sid] = {"meeting_id": meeting_id, "role": role, "name": name}
                if meeting_id not in waiting_room:
                    waiting_room[meeting_id] = []
                waiting_room[meeting_id] = [w for w in waiting_room[meeting_id] if w["name"] != name]
                waiting_room[meeting_id].append({"sid": sid, "name": name, "ts": int(_time.time() * 1000)})
                emit("waiting", {"meetingId": meeting_id})
                socketio.emit("lobby_update", {
                    "meetingId": meeting_id,
                    "waiting": waiting_room.get(meeting_id, []),
                }, room=f"speaker:{meeting_id}")
                logger.info("lobby  waiting  %s -> %s", name, meeting_id)
                return

        join_room(meeting_id)
        socket_data[sid] = {"meeting_id": meeting_id, "role": role, "name": name}

        if role in ("speaker", "monitor"):
            join_room(f"speaker:{meeting_id}")

        if meeting_id not in rooms:
            rooms[meeting_id] = {}

        # Deduplicate by name
        stale_sids = [
            old_sid for old_sid, p in rooms[meeting_id].items()
            if p["name"] == name and old_sid != sid
        ]
        for old_sid in stale_sids:
            rooms[meeting_id].pop(old_sid, None)
            socket_data.pop(old_sid, None)
            if meeting_id in raised_hands:
                raised_hands[meeting_id].discard(old_sid)
            socketio.emit("rtc_peer_left", {"peerId": old_sid}, room=meeting_id)
            logger.debug("room dedup — removed stale sid %s for %s", old_sid, name)

        rooms[meeting_id][sid] = {
            "name": name,
            "role": role,
            "samples": [],
            "active_pct": 0,
            "last_metrics": None,
            "isMuted": False,
            "isVideoOff": False,
        }

        socketio.emit(
            "roomUpdate",
            {"meetingId": meeting_id, "participants": room_snapshot(meeting_id)},
            room=meeting_id,
        )

        # If monitoring is already active, tell the new joiner
        if meeting_id in monitored_sessions:
            emit("monitoring_started", {"meetingId": meeting_id})

        logger.info("room join — %s -> %s (%s)", name, meeting_id, role)

    @socketio.on("disconnect")
    def on_disconnect():
        sid = request.sid
        data = socket_data.pop(sid, None)
        meeting_id = data.get("meeting_id") if data else None
        name = data.get("name") if data else None

        if meeting_id:
            if meeting_id in raised_hands:
                raised_hands[meeting_id].discard(sid)

            # Remove from waiting room if still there
            from state import waiting_room
            if meeting_id in waiting_room:
                before = len(waiting_room[meeting_id])
                waiting_room[meeting_id] = [w for w in waiting_room[meeting_id] if w["sid"] != sid]
                if len(waiting_room[meeting_id]) < before:
                    socketio.emit("lobby_update", {
                        "meetingId": meeting_id,
                        "waiting": waiting_room[meeting_id],
                    }, room=f"speaker:{meeting_id}")

            socketio.emit("rtc_peer_left", {"peerId": sid}, room=meeting_id)

            if meeting_id in rooms:
                rooms[meeting_id].pop(sid, None)
                if not rooms[meeting_id]:
                    del rooms[meeting_id]
                else:
                    socketio.emit(
                        "roomUpdate",
                        {"meetingId": meeting_id,
                         "participants": room_snapshot(meeting_id)},
                        room=meeting_id,
                    )
        logger.info("socket disconnect %s (%s)", sid, name or "?")
