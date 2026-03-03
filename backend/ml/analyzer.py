"""
FaceAnalyzer — orchestrator that ties together feature extraction,
state trackers, classifiers, and the engagement model.
"""

import base64
import io
import logging
import time

import cv2
import numpy as np
import mediapipe as mp
from PIL import Image

logger = logging.getLogger(__name__)

from config import BLINK_RATE_NORMALIZE
from .constants import MODEL_PATH, LEFT_EYE, RIGHT_EYE
from .feature_extraction import (
    avg_ear, mar, smile, brow_raise, head_pose,
    gaze_score, facial_symmetry,
)
from .state_trackers import BlinkTracker, HeadTracker, AudioTracker
from .classifiers import classify_emotion, classify_attention
from .engagement_model import EngagementModel

# MediaPipe tasks API
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
RunningMode = mp.tasks.vision.RunningMode
BaseOptions = mp.tasks.BaseOptions
MpImage = mp.Image
ImageFormat = mp.ImageFormat


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
        self.engagement_model = EngagementModel()
        self.blink_tracker = BlinkTracker()
        self.head_tracker = HeadTracker()
        self.audio_tracker = AudioTracker()

        logger.info("FaceAnalyzer v6 ready  (MediaPipe + GradientBoosting + Gaze + Attention)")

    def analyze_frame(self, base64_data, audio_level=0, name="unknown"):
        try:
            raw = base64_data.split(",")[1] if "," in base64_data else base64_data
            img = Image.open(io.BytesIO(base64.b64decode(raw))).convert("RGB")
            frame = np.array(img)

            mp_image = MpImage(image_format=ImageFormat.SRGB, data=frame)
            result = self.landmarker.detect(mp_image)

            vocal_energy, speech_pace = self.audio_tracker.update(name, audio_level)

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

            # Core features
            ear_val = avg_ear(lm)
            mar_val = mar(lm)
            smile_val = smile(lm)
            brow_val = brow_raise(lm)
            yaw, pitch = head_pose(lm)

            # Enhanced features
            gaze_val = gaze_score(lm)
            symmetry = facial_symmetry(lm)
            blink_rate, drowsiness = self.blink_tracker.update(name, ear_val)
            head_vel = self.head_tracker.velocity(name, yaw, pitch)

            # Emotion (9 states + confidence + all scores)
            emotion, emotion_confidence, emotion_scores = classify_emotion(
                ear_val, mar_val, smile_val, brow_val, gaze_val, audio_level
            )

            # Attention state
            attention = classify_attention(
                gaze_val, yaw, pitch, ear_val, blink_rate, drowsiness
            )

            # Engagement prediction
            blink_norm = min(1.0, blink_rate / BLINK_RATE_NORMALIZE)
            features = [1, ear_val, smile_val, abs(yaw), abs(pitch),
                        min(1.0, audio_level / 100),
                        gaze_val, blink_norm, min(2.0, head_vel), drowsiness]
            engagement = self.engagement_model.predict(features)

            # Feature importances from engagement model
            feature_importances = list(self.engagement_model.model.feature_importances_)

            return {
                "faceDetected": True,
                "engagementScore": engagement,
                "emotion": emotion,
                "emotionConfidence": emotion_confidence,
                "emotionScores": emotion_scores,
                "attentionState": attention,
                "speechPace": speech_pace,
                "vocalEnergy": vocal_energy,
                "audioLevel": audio_level,
                "gazeScore": gaze_val,
                "blinkRate": round(blink_rate, 1),
                "drowsinessScore": drowsiness,
                "headMovement": round(head_vel, 3),
                "features": {
                    "eye_aspect_ratio": round(ear_val, 3),
                    "mouth_aspect_ratio": round(mar_val, 3),
                    "smile_ratio": round(smile_val, 3),
                    "brow_raise_ratio": round(brow_val, 3),
                    "head_yaw": round(yaw, 3),
                    "head_pitch": round(pitch, 3),
                    "gaze_score": gaze_val,
                    "facial_symmetry": symmetry,
                    "blink_rate": round(blink_rate, 1),
                    "drowsiness": drowsiness,
                    "head_velocity": round(head_vel, 3),
                },
                "featureImportances": feature_importances,
                "landmarks": landmarks_2d,
            }
        except Exception as e:
            logger.error("analyze_frame error: %s", e)
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
