"""
EngageAI ML Analyzer v6
~~~~~~~~~~~~~~~~~~~~~~~
Enhanced face detection, emotion recognition, and engagement scoring
using MediaPipe (FaceLandmarker tasks API), OpenCV, NumPy, and scikit-learn.

Pipeline:
  1. Decode base64 JPEG frame
  2. MediaPipe FaceLandmarker -> 478 facial landmarks
  3. Advanced feature engineering:
     - EAR, MAR, smile ratio, head pose, brow raise (v5)
     - Gaze direction via iris landmarks (NEW)
     - Drowsiness / PERCLOS metric (NEW)
     - Head movement velocity (NEW)
     - Blink rate (NEW)
     - Facial symmetry (NEW)
  4. Enhanced emotion classifier -> 9 states with confidence
  5. Attention state classifier (NEW)
  6. Engagement model -> GradientBoosting trained on synthetic data
"""

import base64
import io
import os
import time

import cv2
import numpy as np
import mediapipe as mp
from sklearn.ensemble import GradientBoostingRegressor
from PIL import Image

# MediaPipe tasks API (v0.10.30+)
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
RunningMode = mp.tasks.vision.RunningMode
BaseOptions = mp.tasks.BaseOptions
MpImage = mp.Image
ImageFormat = mp.ImageFormat

# ── Landmark indices (MediaPipe Face Mesh 478 points) ─────────

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

# Eye contour for gaze (wider set)
LEFT_EYE_INNER = 362
LEFT_EYE_OUTER = 263
RIGHT_EYE_INNER = 133
RIGHT_EYE_OUTER = 33

MODEL_PATH = os.path.join(os.path.dirname(__file__), "face_landmarker.task")

# EAR threshold for blink detection
EAR_BLINK_THRESHOLD = 0.21
# PERCLOS: proportion of time eyes are closed over a window
PERCLOS_WINDOW = 30  # frames


class FaceAnalyzer:
    """Real-time face analysis using MediaPipe FaceLandmarker + scikit-learn."""

    def __init__(self):
        options = FaceLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=MODEL_PATH),
            running_mode=RunningMode.IMAGE,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            output_face_blendshapes=False,
        )
        self.landmarker = FaceLandmarker.create_from_options(options)
        self.engagement_model = self._train_engagement_model()
        self.audio_history = {}

        # Per-participant tracking state
        self._blink_state = {}    # name -> {ear_history, blink_count, last_ts, closed}
        self._head_history = {}   # name -> [(yaw, pitch, ts)]
        self._perclos_state = {}  # name -> [is_closed_bool] ring buffer

        print("[ML] FaceAnalyzer v6 ready  (MediaPipe + GradientBoosting + Gaze + Attention)")

    # ── Feature extraction ────────────────────────────────────────

    @staticmethod
    def _pt(lm, idx):
        return np.array([lm[idx].x, lm[idx].y])

    def _ear(self, lm, eye_idx):
        """Eye Aspect Ratio — how open the eye is."""
        p = [self._pt(lm, i) for i in eye_idx]
        v1 = np.linalg.norm(p[1] - p[5])
        v2 = np.linalg.norm(p[2] - p[4])
        h = np.linalg.norm(p[0] - p[3])
        return (v1 + v2) / (2.0 * h) if h > 0 else 0.0

    def _mar(self, lm):
        """Mouth Aspect Ratio — mouth openness."""
        vert = np.linalg.norm(self._pt(lm, UPPER_LIP_CENTER) - self._pt(lm, LOWER_LIP_CENTER))
        horiz = np.linalg.norm(self._pt(lm, LEFT_LIP_CORNER) - self._pt(lm, RIGHT_LIP_CORNER))
        return vert / horiz if horiz > 0 else 0.0

    def _smile(self, lm):
        """Smile ratio — lip corner lift vs centre."""
        lc = self._pt(lm, LEFT_LIP_CORNER)
        rc = self._pt(lm, RIGHT_LIP_CORNER)
        uc = self._pt(lm, UPPER_LIP_CENTER)
        mid_y = (lc[1] + rc[1]) / 2
        w = np.linalg.norm(lc - rc)
        if w == 0:
            return 0.0
        lift = (uc[1] - mid_y) / w
        return max(0.0, min(1.0, lift * 3 + 0.5))

    def _brow_raise(self, lm):
        """Eyebrow raise relative to eyes."""
        avg_brow = np.mean([lm[i].y for i in LEFT_BROW + RIGHT_BROW])
        avg_eye = np.mean([lm[i].y for i in LEFT_EYE + RIGHT_EYE])
        fh = abs(lm[FACE_TOP].y - lm[FACE_BOTTOM].y)
        if fh == 0:
            return 0.5
        return min(1.0, abs(avg_eye - avg_brow) / fh * 5)

    def _head_pose(self, lm):
        """Estimate yaw & pitch from landmark positions."""
        nose = self._pt(lm, NOSE_TIP)
        left = self._pt(lm, FACE_LEFT)
        right = self._pt(lm, FACE_RIGHT)
        top = self._pt(lm, FACE_TOP)
        bot = self._pt(lm, FACE_BOTTOM)
        fw = abs(right[0] - left[0])
        fh = abs(bot[1] - top[1])
        yaw = (nose[0] - (left[0] + right[0]) / 2) / fw if fw > 0 else 0
        pitch = (nose[1] - (top[1] + bot[1]) / 2) / fh if fh > 0 else 0
        return yaw, pitch

    # ── NEW: Gaze direction ──────────────────────────────────────

    def _gaze_score(self, lm):
        """
        Compute gaze score (0-1) based on iris position relative to eye corners.
        1.0 = looking straight at screen, 0.0 = looking far away.
        Uses iris landmarks (468-477) available in MediaPipe FaceLandmarker.
        """
        try:
            # Left eye: iris center relative to eye corners
            l_iris = self._pt(lm, LEFT_IRIS[0])
            l_inner = self._pt(lm, LEFT_EYE_INNER)
            l_outer = self._pt(lm, LEFT_EYE_OUTER)
            l_width = np.linalg.norm(l_inner - l_outer)
            if l_width > 0:
                l_center = (l_inner + l_outer) / 2
                l_offset = np.linalg.norm(l_iris - l_center) / l_width
            else:
                l_offset = 0.5

            # Right eye: iris center relative to eye corners
            r_iris = self._pt(lm, RIGHT_IRIS[0])
            r_inner = self._pt(lm, RIGHT_EYE_INNER)
            r_outer = self._pt(lm, RIGHT_EYE_OUTER)
            r_width = np.linalg.norm(r_inner - r_outer)
            if r_width > 0:
                r_center = (r_inner + r_outer) / 2
                r_offset = np.linalg.norm(r_iris - r_center) / r_width
            else:
                r_offset = 0.5

            avg_offset = (l_offset + r_offset) / 2
            # Convert offset to score: 0 offset = looking straight = 1.0 score
            score = max(0.0, 1.0 - avg_offset * 3.0)
            return round(score, 3)
        except (IndexError, Exception):
            return 0.5

    # ── NEW: Facial symmetry ─────────────────────────────────────

    def _facial_symmetry(self, lm):
        """
        Compare left and right facial landmark positions for symmetry.
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
            nose = self._pt(lm, NOSE_TIP)
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

    # ── NEW: Blink rate & drowsiness ─────────────────────────────

    def _update_blink_state(self, name, ear):
        """Track blinks and compute blink rate (blinks/min) + PERCLOS drowsiness."""
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

        is_closed = ear < EAR_BLINK_THRESHOLD

        # Detect blink (transition from open -> closed -> open)
        if is_closed and not bs["closed"]:
            bs["blink_count"] += 1
        bs["closed"] = is_closed

        # PERCLOS: track eye-closed ratio
        ps.append(is_closed)
        if len(ps) > PERCLOS_WINDOW:
            ps.pop(0)

        # Compute blink rate (blinks per minute)
        elapsed = now - bs["window_start"]
        if elapsed >= 60:
            bs["blink_rate"] = bs["blink_count"]
            bs["blink_count"] = 0
            bs["window_start"] = now
        elif elapsed > 5:
            bs["blink_rate"] = round(bs["blink_count"] / elapsed * 60, 1)

        # PERCLOS drowsiness score (0-1)
        drowsiness = sum(ps) / len(ps) if ps else 0.0

        return bs["blink_rate"], round(drowsiness, 3)

    # ── NEW: Head movement velocity ──────────────────────────────

    def _head_velocity(self, name, yaw, pitch):
        """Track frame-to-frame head pose changes to detect fidgeting/stillness."""
        now = time.time()

        if name not in self._head_history:
            self._head_history[name] = []

        hist = self._head_history[name]
        hist.append((yaw, pitch, now))

        # Keep last 10 frames
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

    # ── Enhanced emotion classifier (9 states) ───────────────────

    @staticmethod
    def _classify_emotion(ear, mar, smile, brow, gaze, audio_level):
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

        return best, confidence

    # ── NEW: Attention state classifier ──────────────────────────

    @staticmethod
    def _classify_attention(gaze, yaw, pitch, ear, blink_rate, drowsiness):
        """
        Classify attention: focused | distracted | drowsy | away
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

    # ── Engagement model (GradientBoosting) ──────────────────────

    @staticmethod
    def _train_engagement_model():
        """
        Train on 5000 synthetic samples with extended feature set.
        Features: [face_detected, ear, smile, |yaw|, |pitch|, audio_level,
                   gaze_score, blink_rate_norm, head_velocity, drowsiness]
        Uses GradientBoostingRegressor (continuous 0-100 score).
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
            blink_norm = rng.uniform(0, 1.0)  # normalized blink rate
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
                     - abs(blink_norm - 0.5) * 10  # normal blink rate is best
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
        print(f"[ML] Engagement model trained  ({n} samples, GradientBoosting 120 trees)")
        return model

    # ── Audio metrics ─────────────────────────────────────────────

    def _update_audio(self, name, level):
        hist = self.audio_history.setdefault(name, [])
        hist.append(level)
        if len(hist) > 30:
            hist.pop(0)
        avg = np.mean(hist[-10:]) if len(hist) >= 2 else level
        energy = "high" if avg > 60 else "medium" if avg > 25 else "low" if avg > 10 else "silent"
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

    # ── Main entry point ──────────────────────────────────────────

    def analyze_frame(self, base64_data, audio_level=0, name="unknown"):
        try:
            raw = base64_data.split(",")[1] if "," in base64_data else base64_data
            img = Image.open(io.BytesIO(base64.b64decode(raw))).convert("RGB")
            frame = np.array(img)

            mp_image = MpImage(image_format=ImageFormat.SRGB, data=frame)
            result = self.landmarker.detect(mp_image)

            vocal_energy, speech_pace = self._update_audio(name, audio_level)

            if not result.face_landmarks:
                eng = max(0, int(audio_level * 0.25))
                return {
                    "faceDetected": False,
                    "engagementScore": eng,
                    "emotion": "neutral",
                    "emotionConfidence": 0.0,
                    "attentionState": "away",
                    "speechPace": speech_pace,
                    "vocalEnergy": vocal_energy,
                    "audioLevel": audio_level,
                    "gazeScore": 0.0,
                    "blinkRate": 0.0,
                    "drowsinessScore": 0.0,
                    "headMovement": 0.0,
                    "features": {},
                    "landmarks": [],
                }

            lm = result.face_landmarks[0]
            landmarks_2d = [{"x": round(l.x, 4), "y": round(l.y, 4)} for l in lm]

            # Core features (v5)
            ear = (self._ear(lm, LEFT_EYE) + self._ear(lm, RIGHT_EYE)) / 2
            mar = self._mar(lm)
            smile = self._smile(lm)
            brow = self._brow_raise(lm)
            yaw, pitch = self._head_pose(lm)

            # Enhanced features (v6)
            gaze = self._gaze_score(lm)
            symmetry = self._facial_symmetry(lm)
            blink_rate, drowsiness = self._update_blink_state(name, ear)
            head_vel = self._head_velocity(name, yaw, pitch)

            # Enhanced emotion (9 states + confidence)
            emotion, emotion_confidence = self._classify_emotion(
                ear, mar, smile, brow, gaze, audio_level
            )

            # Attention state
            attention = self._classify_attention(
                gaze, yaw, pitch, ear, blink_rate, drowsiness
            )

            # Engagement prediction (GradientBoosting with 10 features)
            blink_norm = min(1.0, blink_rate / 30.0)  # normalize: 30 bpm = 1.0
            X = np.array([[1, ear, smile, abs(yaw), abs(pitch),
                           min(1.0, audio_level / 100),
                           gaze, blink_norm, min(2.0, head_vel), drowsiness]])
            engagement = int(round(self.engagement_model.predict(X)[0]))
            engagement = max(0, min(100, engagement))

            return {
                "faceDetected": True,
                "engagementScore": engagement,
                "emotion": emotion,
                "emotionConfidence": emotion_confidence,
                "attentionState": attention,
                "speechPace": speech_pace,
                "vocalEnergy": vocal_energy,
                "audioLevel": audio_level,
                "gazeScore": gaze,
                "blinkRate": round(blink_rate, 1),
                "drowsinessScore": drowsiness,
                "headMovement": round(head_vel, 3),
                "features": {
                    "eye_aspect_ratio": round(ear, 3),
                    "mouth_aspect_ratio": round(mar, 3),
                    "smile_ratio": round(smile, 3),
                    "brow_raise_ratio": round(brow, 3),
                    "head_yaw": round(yaw, 3),
                    "head_pitch": round(pitch, 3),
                    "gaze_score": gaze,
                    "facial_symmetry": symmetry,
                    "blink_rate": round(blink_rate, 1),
                    "drowsiness": drowsiness,
                    "head_velocity": round(head_vel, 3),
                },
                "landmarks": landmarks_2d,
            }
        except Exception as e:
            print(f"[ML] Error: {e}")
            return {
                "faceDetected": False,
                "engagementScore": 0,
                "emotion": "neutral",
                "emotionConfidence": 0.0,
                "attentionState": "away",
                "speechPace": "silent",
                "vocalEnergy": "silent",
                "audioLevel": 0,
                "gazeScore": 0.0,
                "blinkRate": 0.0,
                "drowsinessScore": 0.0,
                "headMovement": 0.0,
                "features": {},
                "landmarks": [],
            }

    def cleanup(self):
        self.landmarker.close()
