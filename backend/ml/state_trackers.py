"""
Per-participant stateful trackers for blink rate, head velocity,
and audio metrics.  Each tracker keeps a small buffer per participant name.
"""

import time
import numpy as np

from config import EAR_BLINK_THRESHOLD, PERCLOS_WINDOW


class BlinkTracker:
    """Track blinks and compute blink rate (blinks/min) + PERCLOS drowsiness."""

    def __init__(self):
        self._blink_state = {}
        self._perclos_state = {}

    def update(self, name, ear_value):
        now = time.time()

        if name not in self._blink_state:
            self._blink_state[name] = {
                "closed": False,
                "blink_count": 0,
                "window_start": now,
                "blink_rate": 0.0,
            }
        if name not in self._perclos_state:
            self._perclos_state[name] = []

        bs = self._blink_state[name]
        ps = self._perclos_state[name]

        is_closed = ear_value < EAR_BLINK_THRESHOLD

        if is_closed and not bs["closed"]:
            bs["blink_count"] += 1
        bs["closed"] = is_closed

        ps.append(is_closed)
        if len(ps) > PERCLOS_WINDOW:
            ps.pop(0)

        elapsed = now - bs["window_start"]
        if elapsed >= 60:
            bs["blink_rate"] = bs["blink_count"]
            bs["blink_count"] = 0
            bs["window_start"] = now
        elif elapsed > 5:
            bs["blink_rate"] = round(bs["blink_count"] / elapsed * 60, 1)

        drowsiness = sum(ps) / len(ps) if ps else 0.0
        return bs["blink_rate"], round(drowsiness, 3)


class HeadTracker:
    """Track frame-to-frame head pose changes to detect fidgeting/stillness."""

    def __init__(self):
        self._history = {}

    def velocity(self, name, yaw, pitch):
        now = time.time()

        if name not in self._history:
            self._history[name] = []

        hist = self._history[name]
        hist.append((yaw, pitch, now))

        if len(hist) > 10:
            hist.pop(0)

        if len(hist) < 2:
            return 0.0

        velocities = []
        for i in range(1, len(hist)):
            dy = hist[i][0] - hist[i - 1][0]
            dp = hist[i][1] - hist[i - 1][1]
            dt = hist[i][2] - hist[i - 1][2]
            if dt > 0:
                vel = np.sqrt(dy ** 2 + dp ** 2) / dt
                velocities.append(vel)

        return round(np.mean(velocities), 3) if velocities else 0.0


class AudioTracker:
    """Track audio level history and derive speech pace / vocal energy."""

    def __init__(self):
        self._history = {}

    def update(self, name, level):
        hist = self._history.setdefault(name, [])
        hist.append(level)
        if len(hist) > 30:
            hist.pop(0)

        avg = np.mean(hist[-10:]) if len(hist) >= 2 else level

        if avg > 60:
            energy = "high"
        elif avg > 25:
            energy = "medium"
        elif avg > 10:
            energy = "low"
        else:
            energy = "silent"

        transitions = 0
        for i in range(1, min(len(hist), 15)):
            if (hist[-i] > 15) != (hist[-i - 1] > 15):
                transitions += 1

        if avg <= 10:
            pace = "silent"
        elif transitions > 6:
            pace = "fast"
        elif transitions > 3:
            pace = "moderate"
        else:
            pace = "slow"

        return energy, pace
