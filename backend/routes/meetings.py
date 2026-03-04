"""Meeting list & analytics routes."""

import logging

from flask import Blueprint, jsonify

from routes.admin import admin_required
from state import rooms
from models.session import list_sessions
from models.analytics import read_analytics

logger = logging.getLogger(__name__)

meetings_bp = Blueprint("meetings", __name__)


@meetings_bp.route("/meetings", methods=["GET"])
@admin_required
def list_meetings():
    """List all meetings with engagement stats (admin only)
    ---
    tags: [Meetings]
    security: [{ Bearer: [] }]
    responses:
      200:
        description: List of meetings
        schema:
          type: object
          properties:
            meetings:
              type: array
              items:
                type: object
                properties:
                  id: { type: string }
                  hostName: { type: string }
                  meetingName: { type: string }
                  createdAt: { type: integer }
                  endedAt: { type: integer }
                  participantCount: { type: integer }
                  avgEngagement: { type: integer }
                  isLive: { type: boolean }
      401: { description: Unauthorized }
    """
    result = []
    try:
        for s in list_sessions():
            sid = s["_id"]
            analytics = read_analytics(sid)
            entry = {
                "id": sid,
                "hostName": s.get("speakerName", "Unknown"),
                "meetingName": s.get("meetingName", ""),
                "createdAt": s.get("createdAt"),
                "endedAt": s.get("endedAt"),
                "hasAnalytics": analytics is not None,
                "isLive": s.get("endedAt") is None and sid in rooms,
            }
            if analytics:
                parts = analytics.get("participants", {})
                all_scores = []
                for pdata in parts.values():
                    all_scores.extend(pdata.get("scores", []))
                entry["participantCount"] = len(parts)
                entry["avgEngagement"] = (
                    round(sum(all_scores) / len(all_scores)) if all_scores else 0
                )
            else:
                entry["participantCount"] = len(rooms.get(sid, {}))
                entry["avgEngagement"] = 0
            result.append(entry)
    except Exception as e:
        logger.warning("Failed to list meetings: %s", e)
    return jsonify({"meetings": result})


@meetings_bp.route("/meetings/<meeting_id>/analytics", methods=["GET"])
@admin_required
def get_meeting_analytics(meeting_id):
    """Get detailed analytics for a meeting (admin only)
    ---
    tags: [Meetings]
    security: [{ Bearer: [] }]
    parameters:
      - { in: path, name: meeting_id, type: string, required: true }
    responses:
      200: { description: Full analytics data including per-participant engagement }
      401: { description: Unauthorized }
      404: { description: No analytics found }
    """
    analytics = read_analytics(meeting_id)
    if not analytics:
        return jsonify({"error": "No analytics found"}), 404
    return jsonify(analytics)
