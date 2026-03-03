"""Waiting lobby handlers — admission control for meetings."""

import time
import logging

from flask import request
from flask_socketio import emit, join_room

from state import waiting_room, rooms, socket_data, raised_hands
from utils import room_snapshot

logger = logging.getLogger(__name__)


def register(socketio):

    @socketio.on("request_join")
    def on_request_join(data):
        if not data:
            return
        meeting_id = data.get("meetingId")
        name = data.get("name")
        if not meeting_id or not name:
            return

        sid = request.sid
        socket_data[sid] = {"meeting_id": meeting_id, "role": "audience", "name": name}

        if meeting_id not in waiting_room:
            waiting_room[meeting_id] = []

        # Remove duplicates by name
        waiting_room[meeting_id] = [
            w for w in waiting_room[meeting_id] if w["name"] != name
        ]

        waiting_room[meeting_id].append({
            "sid": sid,
            "name": name,
            "ts": int(time.time() * 1000),
        })

        emit("waiting", {"meetingId": meeting_id})
        socketio.emit("lobby_update", {
            "meetingId": meeting_id,
            "waiting": waiting_room.get(meeting_id, []),
        }, room=f"speaker:{meeting_id}")

        logger.info("lobby request_join  %s -> %s", name, meeting_id)

    @socketio.on("admit_participant")
    def on_admit_participant(data):
        if not data:
            return
        meeting_id = data.get("meetingId")
        target_sid = data.get("sid")
        if not meeting_id or not target_sid:
            return

        # Find and remove from waiting room
        waiting = waiting_room.get(meeting_id, [])
        person = None
        for w in waiting:
            if w["sid"] == target_sid:
                person = w
                break
        if not person:
            return

        waiting_room[meeting_id] = [w for w in waiting if w["sid"] != target_sid]
        name = person["name"]

        # Add to room
        join_room(meeting_id, sid=target_sid)
        if meeting_id not in rooms:
            rooms[meeting_id] = {}
        rooms[meeting_id][target_sid] = {
            "name": name,
            "role": "audience",
            "samples": [],
            "active_pct": 0,
            "last_metrics": None,
            "isMuted": False,
            "isVideoOff": False,
        }

        socketio.emit("admitted", {"meetingId": meeting_id}, room=target_sid)
        socketio.emit("roomUpdate", {
            "meetingId": meeting_id,
            "participants": room_snapshot(meeting_id),
        }, room=meeting_id)
        socketio.emit("lobby_update", {
            "meetingId": meeting_id,
            "waiting": waiting_room.get(meeting_id, []),
        }, room=f"speaker:{meeting_id}")

        logger.info("lobby admitted  %s -> %s", name, meeting_id)

    @socketio.on("reject_participant")
    def on_reject_participant(data):
        if not data:
            return
        meeting_id = data.get("meetingId")
        target_sid = data.get("sid")
        if not meeting_id or not target_sid:
            return

        waiting = waiting_room.get(meeting_id, [])
        name = None
        for w in waiting:
            if w["sid"] == target_sid:
                name = w["name"]
                break

        waiting_room[meeting_id] = [w for w in waiting if w["sid"] != target_sid]
        socketio.emit("rejected", {"meetingId": meeting_id}, room=target_sid)
        socketio.emit("lobby_update", {
            "meetingId": meeting_id,
            "waiting": waiting_room.get(meeting_id, []),
        }, room=f"speaker:{meeting_id}")

        logger.info("lobby rejected  %s from %s", name or target_sid, meeting_id)

    @socketio.on("admit_all")
    def on_admit_all(data):
        if not data:
            return
        meeting_id = data.get("meetingId")
        if not meeting_id:
            return

        waiting = waiting_room.get(meeting_id, [])
        if not waiting:
            return

        if meeting_id not in rooms:
            rooms[meeting_id] = {}

        for person in waiting:
            target_sid = person["sid"]
            name = person["name"]
            join_room(meeting_id, sid=target_sid)
            rooms[meeting_id][target_sid] = {
                "name": name,
                "role": "audience",
                "samples": [],
                "active_pct": 0,
                "last_metrics": None,
                "isMuted": False,
                "isVideoOff": False,
            }
            socketio.emit("admitted", {"meetingId": meeting_id}, room=target_sid)

        waiting_room[meeting_id] = []
        socketio.emit("roomUpdate", {
            "meetingId": meeting_id,
            "participants": room_snapshot(meeting_id),
        }, room=meeting_id)
        socketio.emit("lobby_update", {
            "meetingId": meeting_id,
            "waiting": [],
        }, room=f"speaker:{meeting_id}")

        logger.info("lobby admit_all  %s (%d admitted)", meeting_id, len(waiting))

    @socketio.on("reject_all")
    def on_reject_all(data):
        if not data:
            return
        meeting_id = data.get("meetingId")
        if not meeting_id:
            return

        waiting = waiting_room.get(meeting_id, [])
        for person in waiting:
            socketio.emit("rejected", {"meetingId": meeting_id}, room=person["sid"])

        waiting_room[meeting_id] = []
        socketio.emit("lobby_update", {
            "meetingId": meeting_id,
            "waiting": [],
        }, room=f"speaker:{meeting_id}")

        logger.info("lobby reject_all  %s", meeting_id)
