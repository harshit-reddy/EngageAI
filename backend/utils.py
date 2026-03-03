"""
EngageAI — Shared utility functions.
"""

import socket
import time
import uuid

from config import ALL_EMOTIONS, ALL_ATTENTION_STATES
from state import rooms, raised_hands, session_summaries, transcripts


def new_id():
    """Generate a short unique meeting/session ID."""
    return uuid.uuid4().hex[:6].upper()


def get_local_ip():
    """Get the real LAN IP address of this machine."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def create_default_metrics(audio_level=0, video_off=False):
    """Return the default (no-face) metrics dict."""
    return {
        "faceDetected": False,
        "engagementScore": max(0, int(audio_level * 0.25)),
        "emotion": "neutral",
        "emotionConfidence": 0.0,
        "attentionState": "away",
        "speechPace": "silent",
        "vocalEnergy": "silent",
        "audioLevel": audio_level,
        "gazeScore": 0.0,
        "blinkRate": 0.0,
        "drowsinessScore": 0.0,
        "headMovement": 0.0,
        "videoOff": video_off,
        "ts": int(time.time() * 1000),
    }


def create_default_participant_summary():
    """Return fresh per-participant summary accumulator."""
    return {
        "scores": [],
        "emotions": {},
        "talk_time_ms": 0,
        "away_time_ms": 0,
        "emotion_timeline": [],
        "emotion_times": {e: 0 for e in ALL_EMOTIONS},
        "visible_time_ms": 0,
        "listening_time_ms": 0,
        "attention_timeline": [],
        "attention_counts": {a: 0 for a in ALL_ATTENTION_STATES},
        "drowsiness_incidents": 0,
        "gaze_scores": [],
        "avg_gaze_score": 0,
    }


def room_snapshot(meeting_id):
    """Build the participant list payload for a room."""
    room = rooms.get(meeting_id, {})
    hands = raised_hands.get(meeting_id, set())
    return [
        {
            "id": sid,
            "name": p["name"],
            "role": p["role"],
            "activePct": p.get("active_pct", 0),
            "lastMetrics": p.get("last_metrics"),
            "handRaised": sid in hands,
            "isMuted": p.get("isMuted", False),
            "isVideoOff": p.get("isVideoOff", False),
        }
        for sid, p in room.items()
    ]


def build_summary(session_id, session_record):
    """Build the end-of-session summary payload."""
    ss = session_summaries.get(session_id)
    if not ss:
        return None
    participant_summaries = []
    for p_name, data in ss["participants"].items():
        scores = data["scores"]
        avg = round(sum(scores) / len(scores)) if scores else 0
        emotions = data.get("emotions", {})
        top_emo = max(emotions, key=emotions.get) if emotions else "neutral"

        attn_counts = data.get("attention_counts", {})
        total_attn = sum(attn_counts.values()) or 1
        focused_pct = round(attn_counts.get("focused", 0) / total_attn * 100)

        gaze_scores = data.get("gaze_scores", [])
        avg_gaze = round(sum(gaze_scores) / len(gaze_scores), 2) if gaze_scores else 0

        participant_summaries.append({
            "name": p_name,
            "avgEngagement": avg,
            "dominantEmotion": top_emo,
            "totalSamples": len(scores),
            "talkTimeMs": data.get("talk_time_ms", 0),
            "awayTimeMs": data.get("away_time_ms", 0),
            "emotionTimes": data.get("emotion_times", {}),
            "visibleTimeMs": data.get("visible_time_ms", 0),
            "listeningTimeMs": data.get("listening_time_ms", 0),
            "focusedPct": focused_pct,
            "avgGazeScore": avg_gaze,
            "drowsinessIncidents": data.get("drowsiness_incidents", 0),
            "attentionCounts": attn_counts,
        })

    all_scores = [p["avgEngagement"] for p in participant_summaries]
    overall_avg = round(sum(all_scores) / len(all_scores)) if all_scores else 0

    return {
        "duration": int((time.time() * 1000 - ss["start_time"]) / 1000),
        "overallEngagement": overall_avg,
        "participantCount": len(participant_summaries),
        "participants": participant_summaries,
        "transcript": transcripts.get(session_id, []),
    }
