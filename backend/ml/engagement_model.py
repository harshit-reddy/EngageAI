"""
GradientBoosting engagement model — trained on synthetic data.
Predicts continuous 0-100 engagement score from 10 facial/audio features.
"""

import logging

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

logger = logging.getLogger(__name__)


class EngagementModel:
    """Wrapper around a GradientBoostingRegressor for engagement prediction."""

    def __init__(self):
        self.model = self._train()

    def _train(self):
        """
        Train on 5000 synthetic samples.
        Features: [face_detected, ear, smile, |yaw|, |pitch|, audio_level,
                   gaze_score, blink_rate_norm, head_velocity, drowsiness]
        """
        rng = np.random.RandomState(42)
        n = 5000
        X, y = [], []

        for _ in range(n):
            face = rng.choice([0, 1], p=[0.10, 0.90])
            ear = rng.uniform(0.15, 0.40)
            smile = rng.uniform(0.10, 0.90)
            yaw = rng.uniform(0, 0.50)
            pitch = rng.uniform(0, 0.40)
            audio = rng.uniform(0, 1.0)
            gaze = rng.uniform(0.1, 1.0)
            blink_norm = rng.uniform(0, 1.0)
            head_vel = rng.uniform(0, 2.0)
            drowsiness = rng.uniform(0, 0.8)

            if face:
                s = (30
                     + ear * 35
                     + smile * 20
                     - yaw * 30
                     - pitch * 15
                     + audio * 15
                     + gaze * 20
                     - abs(blink_norm - 0.5) * 10
                     - head_vel * 8
                     - drowsiness * 25)
            else:
                s = rng.uniform(0, 15)

            s = max(0, min(100, s + rng.normal(0, 3.5)))
            X.append([face, ear, smile, yaw, pitch, audio,
                      gaze, blink_norm, head_vel, drowsiness])
            y.append(float(s))

        model = GradientBoostingRegressor(
            n_estimators=120, max_depth=6, learning_rate=0.1,
            subsample=0.8, random_state=42,
        )
        model.fit(np.array(X), np.array(y))
        logger.info("Engagement model trained  (%d samples, GradientBoosting 120 trees)", n)
        return model

    def predict(self, features):
        """
        Predict engagement score.
        features: 1D array of 10 values matching training feature order.
        Returns int in [0, 100].
        """
        X = np.array([features])
        score = int(round(self.model.predict(X)[0]))
        return max(0, min(100, score))
