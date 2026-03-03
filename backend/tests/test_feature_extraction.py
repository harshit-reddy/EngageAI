"""Tests for ML feature extraction functions."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from ml.feature_extraction import (
    ear, avg_ear, mar, smile, brow_raise, head_pose, gaze_score, facial_symmetry,
)
from ml.constants import LEFT_EYE, RIGHT_EYE


class TestEAR:
    def test_returns_positive(self, fake_landmarks):
        value = ear(fake_landmarks, LEFT_EYE)
        assert value > 0

    def test_returns_float(self, fake_landmarks):
        value = ear(fake_landmarks, LEFT_EYE)
        assert isinstance(value, float)

    def test_both_eyes_similar(self, fake_landmarks):
        left = ear(fake_landmarks, LEFT_EYE)
        right = ear(fake_landmarks, RIGHT_EYE)
        assert abs(left - right) < 0.3  # should be in similar range


class TestAvgEAR:
    def test_returns_positive(self, fake_landmarks):
        assert avg_ear(fake_landmarks) > 0

    def test_average_of_both(self, fake_landmarks):
        a = avg_ear(fake_landmarks)
        left = ear(fake_landmarks, LEFT_EYE)
        right = ear(fake_landmarks, RIGHT_EYE)
        assert abs(a - (left + right) / 2) < 1e-6


class TestMAR:
    def test_returns_non_negative(self, fake_landmarks):
        assert mar(fake_landmarks) >= 0

    def test_returns_float(self, fake_landmarks):
        value = mar(fake_landmarks)
        assert isinstance(value, float)


class TestSmile:
    def test_returns_between_0_and_1(self, fake_landmarks):
        value = smile(fake_landmarks)
        assert 0.0 <= value <= 1.0

    def test_returns_float(self, fake_landmarks):
        assert isinstance(smile(fake_landmarks), float)


class TestBrowRaise:
    def test_returns_between_0_and_1(self, fake_landmarks):
        value = brow_raise(fake_landmarks)
        assert 0.0 <= value <= 1.0


class TestHeadPose:
    def test_returns_tuple(self, fake_landmarks):
        result = head_pose(fake_landmarks)
        assert isinstance(result, tuple)
        assert len(result) == 2

    def test_centered_face_small_yaw(self, fake_landmarks):
        yaw, pitch = head_pose(fake_landmarks)
        assert abs(yaw) < 0.3  # roughly centred


class TestGazeScore:
    def test_returns_between_0_and_1(self, fake_landmarks):
        value = gaze_score(fake_landmarks)
        assert 0.0 <= value <= 1.0

    def test_returns_float(self, fake_landmarks):
        value = gaze_score(fake_landmarks)
        assert isinstance(value, float)


class TestFacialSymmetry:
    def test_returns_between_0_and_1(self, fake_landmarks):
        value = facial_symmetry(fake_landmarks)
        assert 0.0 <= value <= 1.0

    def test_symmetric_face_high_score(self, fake_landmarks):
        # Our fake face is roughly symmetric
        value = facial_symmetry(fake_landmarks)
        assert value > 0.3
