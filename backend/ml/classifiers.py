"""
Rule-based classifiers for emotion (9 states) and attention (4 states).
"""


def classify_emotion(ear, mar, smile, brow, gaze, audio_level):
    """
    Weighted multi-signal emotion classifier.
    Returns (emotion, confidence) with 9 possible states.
    """
    scores = {
        "happy": 0.0, "neutral": 0.3, "surprised": 0.0,
        "sad": 0.0, "angry": 0.0, "fearful": 0.0,
        "disgusted": 0.0, "focused": 0.0, "confused": 0.0,
    }

    # Happy: strong smile
    if smile > 0.55:
        scores["happy"] += smile * 1.2
    if ear > 0.28 and smile > 0.50:
        scores["happy"] += 0.3

    # Surprised: wide eyes + open mouth + raised brows
    if ear > 0.32 and mar > 0.35 and brow > 0.55:
        scores["surprised"] += (ear + mar + brow) / 3

    # Sad: low smile + low brows
    if smile < 0.35 and brow < 0.40:
        scores["sad"] += (1 - smile) * 0.5

    # Angry: low brows + closed mouth + no smile
    if brow < 0.35 and mar < 0.20 and smile < 0.30:
        scores["angry"] += (1 - brow) * 0.4

    # Fearful: wide eyes + raised brows + no smile
    if ear > 0.30 and brow > 0.50 and smile < 0.35:
        scores["fearful"] += ear * 0.5

    # Disgusted: no smile + open mouth + low brows
    if smile < 0.25 and mar > 0.30 and brow < 0.35:
        scores["disgusted"] += 0.35

    # Focused: steady gaze + normal features + audio quiet
    if gaze > 0.6 and 0.22 < ear < 0.34 and smile < 0.55:
        focus_score = gaze * 0.5
        if audio_level < 20:
            focus_score += 0.2
        scores["focused"] += focus_score

    # Confused: raised brows + slight frown + looking at screen
    if brow > 0.50 and smile < 0.40 and 0.10 < mar < 0.35:
        scores["confused"] += brow * 0.4

    # Neutral: intermediate ranges
    if 0.24 < ear < 0.32 and 0.10 < mar < 0.30 and 0.35 < smile < 0.55:
        scores["neutral"] += 0.5

    best = max(scores, key=scores.get)
    total = sum(scores.values())
    confidence = round(scores[best] / total, 2) if total > 0 else 0.0

    # Normalize scores to [0,1] for visualization
    norm_scores = {k: round(v / total, 3) if total > 0 else 0.0 for k, v in scores.items()}

    return best, confidence, norm_scores


def classify_attention(gaze, yaw, pitch, ear, blink_rate, drowsiness):
    """
    Classify attention: focused | distracted | drowsy | away.
    Based on gaze + head pose + blink rate + drowsiness.
    """
    abs_yaw = abs(yaw)
    abs_pitch = abs(pitch)

    # Away: head turned significantly
    if abs_yaw > 0.25 or abs_pitch > 0.25:
        return "away"

    # Drowsy: high PERCLOS or very low EAR sustained
    if drowsiness > 0.4 or (ear < 0.20 and blink_rate > 25):
        return "drowsy"

    # Distracted: low gaze score or moderate head turn
    if gaze < 0.4 or abs_yaw > 0.15:
        return "distracted"

    # Focused: good gaze + stable head + normal blink rate
    return "focused"
