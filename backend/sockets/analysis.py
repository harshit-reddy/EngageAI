"""Frame analysis socket handler — ML inference + session accumulation."""

import logging
import time

from flask import request
from flask_socketio import emit
from eventlet import tpool

from config import (
    LOW_ENGAGEMENT_THRESHOLD, DROWSINESS_ALERT_THRESHOLD,
    DROWSINESS_INCREMENT_THRESHOLD, AUDIO_SPEAKING_THRESHOLD,
)
from state import rooms, session_summaries, monitored_sessions
from models.analytics import write_analytics
from utils import create_default_metrics, create_default_participant_summary

logger = logging.getLogger(__name__)

# Counter for throttled DB writes
_frame_counts = {}


def register(socketio, analyzer=None):
    ml_available = analyzer is not None

    @socketio.on("analyze_frame")
    def on_analyze_frame(payload):
        if not payload:
            return
        meeting_id = payload.get("meetingId")
        name = payload.get("name")
        frame = payload.get("frame")
        audio_level = payload.get("audioLevel", 0)
        video_off = payload.get("videoOff", False)

        if not meeting_id or not name:
            return

        sid = request.sid

        try:
            if video_off or not frame:
                metrics = create_default_metrics(audio_level, video_off=True)
            elif ml_available:
                metrics = tpool.execute(analyzer.analyze_frame, frame, audio_level, name)
                metrics["videoOff"] = False
                metrics["ts"] = int(time.time() * 1000)
            else:
                metrics = create_default_metrics(audio_level, video_off=False)
        except Exception as e:
            logger.warning("analyze_frame error for %s: %s", name, e)
            metrics = create_default_metrics(0, video_off=video_off)

        # Send result back to participant
        emit("engagement_result", metrics)

        # Update room state
        p = rooms.get(meeting_id, {}).get(sid)
        if p:
            eng = metrics.get("engagementScore", 0)
            p["last_metrics"] = metrics
            p["samples"].append(eng)
            if len(p["samples"]) > 30:
                p["samples"].pop(0)
            p["active_pct"] = round(sum(p["samples"]) / len(p["samples"]))

        # Accumulate session summary
        if meeting_id not in session_summaries:
            session_summaries[meeting_id] = {
                "start_time": int(time.time() * 1000),
                "participants": {},
            }
        ss = session_summaries[meeting_id]
        if name not in ss["participants"]:
            ss["participants"][name] = create_default_participant_summary()
        pd = ss["participants"][name]
        pd["scores"].append(metrics.get("engagementScore", 0))

        emo = metrics.get("emotion")
        if emo:
            pd["emotions"][emo] = pd["emotions"].get(emo, 0) + 1
            pd["emotion_timeline"].append({"ts": metrics.get("ts"), "emotion": emo})
            if emo in pd.get("emotion_times", {}):
                pd["emotion_times"][emo] += 1000

        # Track attention state
        attn = metrics.get("attentionState", "away")
        pd["attention_timeline"].append({"ts": metrics.get("ts"), "state": attn})
        pd["attention_counts"][attn] = pd["attention_counts"].get(attn, 0) + 1

        # Track gaze
        gaze = metrics.get("gazeScore", 0)
        pd["gaze_scores"].append(gaze)
        if pd["gaze_scores"]:
            pd["avg_gaze_score"] = round(
                sum(pd["gaze_scores"]) / len(pd["gaze_scores"]), 2
            )

        # Track drowsiness incidents
        drowsiness = metrics.get("drowsinessScore", 0)
        if drowsiness > DROWSINESS_INCREMENT_THRESHOLD:
            pd["drowsiness_incidents"] = pd.get("drowsiness_incidents", 0) + 1

        if metrics.get("audioLevel", 0) > AUDIO_SPEAKING_THRESHOLD:
            pd["talk_time_ms"] += 1000
        if not metrics.get("faceDetected") and not metrics.get("videoOff"):
            pd["away_time_ms"] += 1000

        if metrics.get("faceDetected"):
            pd["visible_time_ms"] = pd.get("visible_time_ms", 0) + 1000
            if metrics.get("audioLevel", 0) <= AUDIO_SPEAKING_THRESHOLD and not metrics.get("videoOff"):
                pd["listening_time_ms"] = pd.get("listening_time_ms", 0) + 1000

        # Throttled DB writes — every 10 frames instead of every frame
        if meeting_id in monitored_sessions:
            _frame_counts[meeting_id] = _frame_counts.get(meeting_id, 0) + 1
            if _frame_counts[meeting_id] >= 10:
                write_analytics(meeting_id)
                _frame_counts[meeting_id] = 0

        # Broadcast to host/monitor (include landmarks + emotionScores for monitor)
        socketio.emit("audienceEngagement", {
            "participantId": sid, "name": name,
            "metrics": metrics,
            "activePct": p["active_pct"] if p else 0,
        }, room=f"speaker:{meeting_id}")

        # Low engagement alert
        seen_names = set()
        unique_scores = []
        for x in rooms.get(meeting_id, {}).values():
            if x["name"] not in seen_names and x["active_pct"] > 0:
                seen_names.add(x["name"])
                unique_scores.append(x["active_pct"])
        if unique_scores:
            avg = round(sum(unique_scores) / len(unique_scores))
            if avg < LOW_ENGAGEMENT_THRESHOLD:
                socketio.emit("alert", {
                    "type": "low_engagement",
                    "message": f"Overall engagement dropped to {avg}%",
                    "level": "warning",
                    "ts": int(time.time() * 1000),
                }, room=f"speaker:{meeting_id}")

        # Drowsiness alert
        if drowsiness > DROWSINESS_ALERT_THRESHOLD:
            socketio.emit("alert", {
                "type": "drowsiness",
                "message": f"{name} appears drowsy (score: {round(drowsiness * 100)}%)",
                "level": "warning",
                "ts": int(time.time() * 1000),
            }, room=f"speaker:{meeting_id}")
