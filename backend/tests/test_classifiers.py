"""Tests for emotion and attention classifiers."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from ml.classifiers import classify_emotion, classify_attention
from config import ALL_EMOTIONS, ALL_ATTENTION_STATES


class TestClassifyEmotion:
    def test_returns_tuple(self):
        result = classify_emotion(0.28, 0.15, 0.45, 0.45, 0.7, 10)
        assert isinstance(result, tuple)
        assert len(result) == 2

    def test_emotion_in_valid_set(self):
        emotion, _ = classify_emotion(0.28, 0.15, 0.45, 0.45, 0.7, 10)
        assert emotion in ALL_EMOTIONS

    def test_confidence_between_0_and_1(self):
        _, confidence = classify_emotion(0.28, 0.15, 0.45, 0.45, 0.7, 10)
        assert 0.0 <= confidence <= 1.0

    def test_happy_with_strong_smile(self):
        emotion, _ = classify_emotion(ear=0.30, mar=0.15, smile=0.75, brow=0.45, gaze=0.7, audio_level=10)
        assert emotion == "happy"

    def test_surprised_with_wide_features(self):
        emotion, _ = classify_emotion(ear=0.35, mar=0.40, smile=0.30, brow=0.60, gaze=0.5, audio_level=10)
        assert emotion == "surprised"

    def test_focused_with_good_gaze(self):
        emotion, _ = classify_emotion(ear=0.28, mar=0.15, smile=0.40, brow=0.45, gaze=0.8, audio_level=5)
        assert emotion == "focused"

    def test_neutral_with_intermediate_values(self):
        emotion, _ = classify_emotion(ear=0.28, mar=0.20, smile=0.45, brow=0.45, gaze=0.3, audio_level=10)
        assert emotion == "neutral"

    def test_all_emotions_reachable(self):
        """Ensure every emotion can be produced by some input combination."""
        reached = set()

        test_cases = [
            (0.30, 0.15, 0.75, 0.45, 0.7, 10),     # happy
            (0.28, 0.20, 0.45, 0.45, 0.3, 10),       # neutral
            (0.35, 0.40, 0.30, 0.60, 0.5, 10),       # surprised
            (0.25, 0.10, 0.25, 0.30, 0.3, 5),         # sad
            (0.25, 0.15, 0.20, 0.30, 0.3, 5),         # angry
            (0.32, 0.15, 0.25, 0.55, 0.5, 5),         # fearful
            (0.25, 0.35, 0.20, 0.30, 0.3, 5),         # disgusted
            (0.28, 0.15, 0.40, 0.45, 0.8, 5),         # focused
            (0.28, 0.25, 0.30, 0.55, 0.5, 10),        # confused
        ]

        for args in test_cases:
            emotion, _ = classify_emotion(*args)
            reached.add(emotion)

        assert reached == set(ALL_EMOTIONS), f"Missing: {set(ALL_EMOTIONS) - reached}"


class TestClassifyAttention:
    def test_returns_string(self):
        result = classify_attention(gaze=0.7, yaw=0.0, pitch=0.0, ear=0.28, blink_rate=15, drowsiness=0.1)
        assert isinstance(result, str)

    def test_result_in_valid_set(self):
        result = classify_attention(gaze=0.7, yaw=0.0, pitch=0.0, ear=0.28, blink_rate=15, drowsiness=0.1)
        assert result in ALL_ATTENTION_STATES

    def test_focused_with_good_signals(self):
        result = classify_attention(gaze=0.7, yaw=0.05, pitch=0.05, ear=0.28, blink_rate=15, drowsiness=0.1)
        assert result == "focused"

    def test_away_with_head_turned(self):
        result = classify_attention(gaze=0.7, yaw=0.30, pitch=0.0, ear=0.28, blink_rate=15, drowsiness=0.1)
        assert result == "away"

    def test_away_with_head_tilted(self):
        result = classify_attention(gaze=0.7, yaw=0.0, pitch=0.30, ear=0.28, blink_rate=15, drowsiness=0.1)
        assert result == "away"

    def test_drowsy_with_high_perclos(self):
        result = classify_attention(gaze=0.7, yaw=0.0, pitch=0.0, ear=0.28, blink_rate=15, drowsiness=0.5)
        assert result == "drowsy"

    def test_drowsy_with_low_ear_high_blink(self):
        result = classify_attention(gaze=0.7, yaw=0.0, pitch=0.0, ear=0.18, blink_rate=30, drowsiness=0.1)
        assert result == "drowsy"

    def test_distracted_with_low_gaze(self):
        result = classify_attention(gaze=0.3, yaw=0.05, pitch=0.05, ear=0.28, blink_rate=15, drowsiness=0.1)
        assert result == "distracted"

    def test_distracted_with_moderate_yaw(self):
        result = classify_attention(gaze=0.7, yaw=0.18, pitch=0.05, ear=0.28, blink_rate=15, drowsiness=0.1)
        assert result == "distracted"

    def test_all_states_reachable(self):
        """Ensure every attention state can be produced."""
        reached = set()

        cases = [
            dict(gaze=0.7, yaw=0.05, pitch=0.05, ear=0.28, blink_rate=15, drowsiness=0.1),  # focused
            dict(gaze=0.3, yaw=0.05, pitch=0.05, ear=0.28, blink_rate=15, drowsiness=0.1),  # distracted
            dict(gaze=0.7, yaw=0.0, pitch=0.0, ear=0.28, blink_rate=15, drowsiness=0.5),     # drowsy
            dict(gaze=0.7, yaw=0.30, pitch=0.0, ear=0.28, blink_rate=15, drowsiness=0.1),    # away
        ]

        for kwargs in cases:
            reached.add(classify_attention(**kwargs))

        assert reached == set(ALL_ATTENTION_STATES), f"Missing: {set(ALL_ATTENTION_STATES) - reached}"
