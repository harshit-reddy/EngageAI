"""Session collection CRUD operations."""

import logging
import time

from extensions import sessions_col
from utils import new_id

logger = logging.getLogger(__name__)


def create_session(speaker_name, lobby_enabled=True, meeting_name=""):
    """Insert a new session document and return its ID."""
    session_id = new_id()
    doc = {
        "_id": session_id,
        "id": session_id,
        "speakerName": speaker_name,
        "meetingName": meeting_name,
        "createdAt": int(time.time() * 1000),
        "endedAt": None,
        "lobbyEnabled": lobby_enabled,
    }
    try:
        sessions_col.insert_one(doc)
    except Exception as e:
        logger.warning("Failed to create session in DB: %s", e)
    return session_id


def get_session(session_id):
    """Return session document or None."""
    return sessions_col.find_one({"_id": session_id})


def end_session(session_id):
    """Mark a session as ended. Returns the endedAt timestamp."""
    ended_at = int(time.time() * 1000)
    sessions_col.update_one({"_id": session_id}, {"$set": {"endedAt": ended_at}})
    return ended_at


def delete_session(session_id):
    """Delete a session document from DB."""
    sessions_col.delete_one({"_id": session_id})


def list_sessions():
    """Return a cursor of all sessions sorted newest first."""
    from pymongo import DESCENDING
    return sessions_col.find().sort("createdAt", DESCENDING)
