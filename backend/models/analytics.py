"""Analytics collection read/write operations."""

import logging

from extensions import sessions_col, analytics_col
from state import session_summaries, transcripts

logger = logging.getLogger(__name__)


def write_analytics(meeting_id):
    """Upsert session_summaries + transcript into MongoDB analytics collection."""
    ss = session_summaries.get(meeting_id)
    if not ss:
        return
    session_rec = sessions_col.find_one({"_id": meeting_id}) or {}
    payload = {
        "meetingId": meeting_id,
        "hostName": session_rec.get("speakerName", "Unknown"),
        "startTime": ss["start_time"],
        "endedAt": session_rec.get("endedAt"),
        "participants": {},
        "transcript": transcripts.get(meeting_id, []),
    }
    for p_name, pdata in ss["participants"].items():
        payload["participants"][p_name] = {
            "scores": pdata["scores"],
            "emotions": pdata.get("emotions", {}),
            "emotion_timeline": pdata.get("emotion_timeline", []),
            "talk_time_ms": pdata.get("talk_time_ms", 0),
            "away_time_ms": pdata.get("away_time_ms", 0),
            "emotion_times": pdata.get("emotion_times", {}),
            "visible_time_ms": pdata.get("visible_time_ms", 0),
            "listening_time_ms": pdata.get("listening_time_ms", 0),
            "attention_timeline": pdata.get("attention_timeline", []),
            "attention_counts": pdata.get("attention_counts", {}),
            "drowsiness_incidents": pdata.get("drowsiness_incidents", 0),
            "avg_gaze_score": pdata.get("avg_gaze_score", 0),
            "gaze_scores": pdata.get("gaze_scores", []),
        }
    try:
        analytics_col.update_one(
            {"_id": meeting_id},
            {"$set": payload},
            upsert=True,
        )
    except Exception as e:
        logger.warning("Failed to write analytics for %s: %s", meeting_id, e)


def delete_analytics(meeting_id):
    """Delete analytics for a meeting from MongoDB."""
    try:
        analytics_col.delete_one({"_id": meeting_id})
    except Exception as e:
        logger.warning("Failed to delete analytics for %s: %s", meeting_id, e)


def read_analytics(meeting_id):
    """Read persisted analytics from MongoDB."""
    try:
        doc = analytics_col.find_one({"_id": meeting_id})
        if doc:
            doc.pop("_id", None)
        return doc
    except Exception:
        return None
