"""
Geometric feature extraction from MediaPipe face landmarks.
All functions are stateless and operate on a single frame's landmarks.
"""

import numpy as np

from .constants import (
    LEFT_EYE, RIGHT_EYE, UPPER_LIP_CENTER, LOWER_LIP_CENTER,
    LEFT_LIP_CORNER, RIGHT_LIP_CORNER, LEFT_BROW, RIGHT_BROW,
    NOSE_TIP, FACE_LEFT, FACE_RIGHT, FACE_TOP, FACE_BOTTOM,
    LEFT_IRIS, LEFT_EYE_INNER, LEFT_EYE_OUTER,
    RIGHT_IRIS, RIGHT_EYE_INNER, RIGHT_EYE_OUTER,
)


def _pt(lm, idx):
    """Extract 2D point from landmark list."""
    return np.array([lm[idx].x, lm[idx].y])


def ear(lm, eye_idx):
    """Eye Aspect Ratio — how open the eye is."""
    p = [_pt(lm, i) for i in eye_idx]
    v1 = np.linalg.norm(p[1] - p[5])
    v2 = np.linalg.norm(p[2] - p[4])
    h = np.linalg.norm(p[0] - p[3])
    return (v1 + v2) / (2.0 * h) if h > 0 else 0.0


def avg_ear(lm):
    """Average EAR across both eyes."""
    return (ear(lm, LEFT_EYE) + ear(lm, RIGHT_EYE)) / 2


def mar(lm):
    """Mouth Aspect Ratio — mouth openness."""
    vert = np.linalg.norm(_pt(lm, UPPER_LIP_CENTER) - _pt(lm, LOWER_LIP_CENTER))
    horiz = np.linalg.norm(_pt(lm, LEFT_LIP_CORNER) - _pt(lm, RIGHT_LIP_CORNER))
    return vert / horiz if horiz > 0 else 0.0


def smile(lm):
    """Smile ratio — lip corner lift vs centre."""
    lc = _pt(lm, LEFT_LIP_CORNER)
    rc = _pt(lm, RIGHT_LIP_CORNER)
    uc = _pt(lm, UPPER_LIP_CENTER)
    mid_y = (lc[1] + rc[1]) / 2
    w = np.linalg.norm(lc - rc)
    if w == 0:
        return 0.0
    lift = (uc[1] - mid_y) / w
    return max(0.0, min(1.0, lift * 3 + 0.5))


def brow_raise(lm):
    """Eyebrow raise relative to eyes."""
    avg_brow = np.mean([lm[i].y for i in LEFT_BROW + RIGHT_BROW])
    avg_eye = np.mean([lm[i].y for i in LEFT_EYE + RIGHT_EYE])
    fh = abs(lm[FACE_TOP].y - lm[FACE_BOTTOM].y)
    if fh == 0:
        return 0.5
    return min(1.0, abs(avg_eye - avg_brow) / fh * 5)


def head_pose(lm):
    """Estimate yaw & pitch from landmark positions."""
    nose = _pt(lm, NOSE_TIP)
    left = _pt(lm, FACE_LEFT)
    right = _pt(lm, FACE_RIGHT)
    top = _pt(lm, FACE_TOP)
    bot = _pt(lm, FACE_BOTTOM)
    fw = abs(right[0] - left[0])
    fh = abs(bot[1] - top[1])
    yaw = (nose[0] - (left[0] + right[0]) / 2) / fw if fw > 0 else 0
    pitch = (nose[1] - (top[1] + bot[1]) / 2) / fh if fh > 0 else 0
    return yaw, pitch


def gaze_score(lm):
    """
    Gaze score (0-1) based on iris position relative to eye corners.
    1.0 = looking straight at screen, 0.0 = looking far away.
    """
    try:
        l_iris = _pt(lm, LEFT_IRIS[0])
        l_inner = _pt(lm, LEFT_EYE_INNER)
        l_outer = _pt(lm, LEFT_EYE_OUTER)
        l_width = np.linalg.norm(l_inner - l_outer)
        if l_width > 0:
            l_center = (l_inner + l_outer) / 2
            l_offset = np.linalg.norm(l_iris - l_center) / l_width
        else:
            l_offset = 0.5

        r_iris = _pt(lm, RIGHT_IRIS[0])
        r_inner = _pt(lm, RIGHT_EYE_INNER)
        r_outer = _pt(lm, RIGHT_EYE_OUTER)
        r_width = np.linalg.norm(r_inner - r_outer)
        if r_width > 0:
            r_center = (r_inner + r_outer) / 2
            r_offset = np.linalg.norm(r_iris - r_center) / r_width
        else:
            r_offset = 0.5

        avg_offset = (l_offset + r_offset) / 2
        score = max(0.0, 1.0 - avg_offset * 3.0)
        return round(score, 3)
    except (IndexError, Exception):
        return 0.5


def facial_symmetry(lm):
    """
    Compare left and right facial landmark positions.
    Returns 0-1 where 1 = perfectly symmetric.
    """
    try:
        pairs = [
            (LEFT_EYE[0], RIGHT_EYE[0]),
            (LEFT_EYE[3], RIGHT_EYE[3]),
            (LEFT_BROW[0], RIGHT_BROW[0]),
            (LEFT_BROW[2], RIGHT_BROW[2]),
            (LEFT_LIP_CORNER, RIGHT_LIP_CORNER),
        ]
        nose = _pt(lm, NOSE_TIP)
        fw = abs(lm[FACE_RIGHT].x - lm[FACE_LEFT].x)
        if fw == 0:
            return 0.5

        diffs = []
        for li, ri in pairs:
            l_dist = abs(lm[li].x - nose[0])
            r_dist = abs(lm[ri].x - nose[0])
            diff = abs(l_dist - r_dist) / fw
            diffs.append(diff)

        avg_diff = np.mean(diffs)
        symmetry = max(0.0, 1.0 - avg_diff * 5.0)
        return round(symmetry, 3)
    except Exception:
        return 0.5
