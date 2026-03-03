"""
ML landmark indices, model path, and related constants.
All values come from the MediaPipe Face Mesh 478-point topology.
"""

import os

# ── Landmark indices ──────────────────────────────────────────
LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]

UPPER_LIP_CENTER = 13
LOWER_LIP_CENTER = 14
LEFT_LIP_CORNER = 61
RIGHT_LIP_CORNER = 291

LEFT_BROW = [276, 283, 282, 295, 285]
RIGHT_BROW = [46, 53, 52, 65, 55]

NOSE_TIP = 1
FACE_LEFT = 234
FACE_RIGHT = 454
FACE_TOP = 10
FACE_BOTTOM = 152

# Iris landmarks (468-477)
LEFT_IRIS = [468, 469, 470, 471, 472]   # center=468
RIGHT_IRIS = [473, 474, 475, 476, 477]  # center=473

LEFT_EYE_INNER = 362
LEFT_EYE_OUTER = 263
RIGHT_EYE_INNER = 133
RIGHT_EYE_OUTER = 33

# ── Model path ────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "face_landmarker.task")
