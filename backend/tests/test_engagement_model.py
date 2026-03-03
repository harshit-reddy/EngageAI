"""Tests for the GradientBoosting engagement model."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from ml.engagement_model import EngagementModel


@pytest.fixture(scope="module")
def model():
    """Train model once per test module (expensive)."""
    return EngagementModel()


class TestEngagementModel:
    def test_predict_returns_int(self, model):
        features = [1, 0.28, 0.5, 0.1, 0.1, 0.3, 0.7, 0.5, 0.3, 0.1]
        score = model.predict(features)
        assert isinstance(score, int)

    def test_predict_in_range(self, model):
        features = [1, 0.28, 0.5, 0.1, 0.1, 0.3, 0.7, 0.5, 0.3, 0.1]
        score = model.predict(features)
        assert 0 <= score <= 100

    def test_no_face_low_score(self, model):
        # face_detected=0 should yield very low engagement
        features = [0, 0.28, 0.5, 0.1, 0.1, 0.3, 0.7, 0.5, 0.3, 0.1]
        score = model.predict(features)
        assert score < 30

    def test_good_signals_high_score(self, model):
        # Good engagement: face=1, open eyes, smile, straight gaze, low yaw/pitch
        features = [1, 0.35, 0.7, 0.02, 0.02, 0.5, 0.9, 0.5, 0.1, 0.0]
        score = model.predict(features)
        assert score > 50

    def test_drowsy_lower_score(self, model):
        # High drowsiness should reduce score
        good = [1, 0.35, 0.7, 0.02, 0.02, 0.5, 0.9, 0.5, 0.1, 0.0]
        drowsy = [1, 0.35, 0.7, 0.02, 0.02, 0.5, 0.9, 0.5, 0.1, 0.7]
        assert model.predict(good) > model.predict(drowsy)

    def test_turned_away_lower_score(self, model):
        # Large yaw (head turned) should lower engagement
        straight = [1, 0.28, 0.5, 0.05, 0.05, 0.3, 0.7, 0.5, 0.3, 0.1]
        turned = [1, 0.28, 0.5, 0.45, 0.05, 0.3, 0.7, 0.5, 0.3, 0.1]
        assert model.predict(straight) > model.predict(turned)

    def test_high_gaze_better(self, model):
        # Better gaze score should increase engagement
        low_gaze = [1, 0.28, 0.5, 0.05, 0.05, 0.3, 0.2, 0.5, 0.3, 0.1]
        high_gaze = [1, 0.28, 0.5, 0.05, 0.05, 0.3, 0.9, 0.5, 0.3, 0.1]
        assert model.predict(high_gaze) > model.predict(low_gaze)

    def test_multiple_predictions_consistent(self, model):
        # Same input should always give same output (deterministic)
        features = [1, 0.28, 0.5, 0.1, 0.1, 0.3, 0.7, 0.5, 0.3, 0.1]
        scores = [model.predict(features) for _ in range(5)]
        assert len(set(scores)) == 1
