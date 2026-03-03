"""
Shared fixtures for EngageAI backend tests.
"""

import sys
import os
import types
import pytest

# Ensure backend is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class _FakeLandmark:
    """Minimal landmark stub with .x, .y, .z attributes."""

    def __init__(self, x=0.0, y=0.0, z=0.0):
        self.x = x
        self.y = y
        self.z = z


@pytest.fixture
def fake_landmarks():
    """
    Generate a 478-element landmark list with plausible face geometry.
    Eyes open, mouth closed, looking straight ahead.
    """
    lm = [_FakeLandmark(0.5, 0.5) for _ in range(478)]

    # Nose tip (#1) at centre
    lm[1] = _FakeLandmark(0.50, 0.55)

    # Face bounds
    lm[10] = _FakeLandmark(0.50, 0.30)    # FACE_TOP
    lm[152] = _FakeLandmark(0.50, 0.80)   # FACE_BOTTOM
    lm[234] = _FakeLandmark(0.30, 0.55)   # FACE_LEFT
    lm[454] = _FakeLandmark(0.70, 0.55)   # FACE_RIGHT

    # Left eye (open) - indices: 362, 385, 387, 263, 373, 380
    lm[362] = _FakeLandmark(0.38, 0.45)  # p0 (outer corner)
    lm[385] = _FakeLandmark(0.40, 0.43)  # p1 (upper)
    lm[387] = _FakeLandmark(0.42, 0.43)  # p2 (upper)
    lm[263] = _FakeLandmark(0.44, 0.45)  # p3 (inner corner)
    lm[373] = _FakeLandmark(0.42, 0.47)  # p4 (lower)
    lm[380] = _FakeLandmark(0.40, 0.47)  # p5 (lower)

    # Right eye (open) - indices: 33, 160, 158, 133, 153, 144
    lm[33] = _FakeLandmark(0.56, 0.45)
    lm[160] = _FakeLandmark(0.58, 0.43)
    lm[158] = _FakeLandmark(0.60, 0.43)
    lm[133] = _FakeLandmark(0.62, 0.45)
    lm[153] = _FakeLandmark(0.60, 0.47)
    lm[144] = _FakeLandmark(0.58, 0.47)

    # Lip landmarks
    lm[13] = _FakeLandmark(0.50, 0.64)    # upper lip centre
    lm[14] = _FakeLandmark(0.50, 0.66)    # lower lip centre
    lm[61] = _FakeLandmark(0.45, 0.65)    # left lip corner
    lm[291] = _FakeLandmark(0.55, 0.65)   # right lip corner

    # Brows - LEFT_BROW: [276, 283, 282, 295, 285]
    for i in [276, 283, 282, 295, 285]:
        lm[i] = _FakeLandmark(0.40, 0.40)

    # RIGHT_BROW: [46, 53, 52, 65, 55]
    for i in [46, 53, 52, 65, 55]:
        lm[i] = _FakeLandmark(0.60, 0.40)

    # Iris landmarks
    lm[468] = _FakeLandmark(0.41, 0.45)   # left iris centre
    lm[473] = _FakeLandmark(0.59, 0.45)   # right iris centre

    # Eye inner/outer for gaze
    lm[362] = _FakeLandmark(0.38, 0.45)   # LEFT_EYE_INNER
    lm[263] = _FakeLandmark(0.44, 0.45)   # LEFT_EYE_OUTER
    lm[133] = _FakeLandmark(0.62, 0.45)   # RIGHT_EYE_INNER
    lm[33] = _FakeLandmark(0.56, 0.45)    # RIGHT_EYE_OUTER

    return lm


@pytest.fixture
def flask_app():
    """Create a test Flask app with all routes registered (no MongoDB needed)."""
    from flask import Flask
    from flask_cors import CORS

    app = Flask(__name__)
    app.config["TESTING"] = True
    CORS(app)

    # Register the admin blueprint directly (no DB dependency)
    from routes.admin import admin_bp
    from routes.network import network_bp
    app.register_blueprint(admin_bp)
    app.register_blueprint(network_bp)

    return app


@pytest.fixture
def client(flask_app):
    """Flask test client."""
    return flask_app.test_client()
