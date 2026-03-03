"""Feedback collection CRUD operations."""

import logging
import time
import uuid

from pymongo import DESCENDING

from extensions import feedback_col

logger = logging.getLogger(__name__)


def save_feedback(meeting_id, from_name, message):
    """Insert a feedback document. Returns the item dict (with 'id' key)."""
    item = {
        "_id": str(uuid.uuid4()),
        "meetingId": meeting_id,
        "from": from_name,
        "message": message,
        "createdAt": int(time.time() * 1000),
    }
    try:
        feedback_col.insert_one(item)
    except Exception as e:
        logger.warning("Failed to save feedback: %s", e)

    emit_item = {k: v for k, v in item.items() if k != "_id"}
    emit_item["id"] = item["_id"]
    return emit_item


def get_feedback(meeting_id):
    """Return list of feedback documents for a meeting."""
    try:
        fb = list(feedback_col.find({"meetingId": meeting_id}).sort("createdAt", DESCENDING))
        for f in fb:
            f["id"] = f.pop("_id", "")
        return fb
    except Exception:
        return []
