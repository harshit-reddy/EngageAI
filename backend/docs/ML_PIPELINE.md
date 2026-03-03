# EngageAI — ML Pipeline Documentation

## Overview

EngageAI uses a multi-stage ML pipeline to analyse engagement from webcam frames in real-time. The system combines **MediaPipe Face Mesh** (478 landmarks) with geometric feature extraction, rule-based classifiers, and a **GradientBoosting regression model** for engagement scoring.

## Pipeline Stages

```
Webcam Frame (JPEG)
       │
       ▼
┌──────────────────┐
│  MediaPipe Face   │  478 3D landmarks
│  Landmarker       │  per detected face
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Feature          │  EAR, MAR, smile, brow,
│  Extraction       │  gaze, head pose, symmetry
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  State            │  Blink rate, PERCLOS,
│  Trackers         │  head velocity, vocal energy
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│Emotion │ │Attn.   │
│Classif.│ │Classif.│
│(9 cls) │ │(4 cls) │
└────┬───┘ └───┬────┘
     │         │
     ▼         ▼
┌──────────────────┐
│  Engagement       │  GradientBoosting
│  Model            │  Score: 0-100
└──────────────────┘
```

## Stage 1: Face Detection (MediaPipe)

**Model**: MediaPipe FaceLandmarker task file (`face_landmarker.task`)
- **Input**: RGB image (typically 640×480)
- **Output**: 478-point 3D face mesh with (x, y, z) normalised coordinates
- **Configuration**: `min_face_detection_confidence=0.5`, single face mode

## Stage 2: Feature Extraction

All functions are stateless and operate on a single frame's landmarks.

| Feature | Formula | Range | Source |
|---------|---------|-------|--------|
| **EAR** (Eye Aspect Ratio) | `(‖p1-p5‖ + ‖p2-p4‖) / (2·‖p0-p3‖)` | 0.15-0.40 | Soukupová & Čech (2016) |
| **MAR** (Mouth Aspect Ratio) | `‖upper_lip - lower_lip‖ / ‖left_corner - right_corner‖` | 0.0-1.0+ | Vertical/horizontal lip ratio |
| **Smile Ratio** | `(upper_lip_y - corner_midpoint_y) / lip_width × 3 + 0.5` | 0.0-1.0 | Lip corner lift normalised |
| **Brow Raise** | `‖avg_brow_y - avg_eye_y‖ / face_height × 5` | 0.0-1.0 | Brow-eye distance vs face scale |
| **Head Yaw** | `(nose_x - face_center_x) / face_width` | -0.5 to 0.5 | Horizontal head rotation |
| **Head Pitch** | `(nose_y - face_center_y) / face_height` | -0.5 to 0.5 | Vertical head tilt |
| **Gaze Score** | `1.0 - avg_iris_offset × 3.0` | 0.0-1.0 | Iris position vs eye center |
| **Facial Symmetry** | `1.0 - avg_landmark_asymmetry × 5.0` | 0.0-1.0 | Left-right landmark comparison |

### EAR (Eye Aspect Ratio)
The EAR metric uses 6 eye landmarks per eye. When eyes are open, EAR ≈ 0.25-0.35. When closed, EAR drops below 0.21 (the blink threshold).

```
      p1   p2
p0 ─────────── p3  (horizontal)
      p5   p4
```

### Gaze Score
Iris position (landmarks 468, 473) is compared to eye corner midpoints. An iris at the center yields score ≈ 1.0; offset iris (looking away) yields lower scores.

## Stage 3: State Trackers

State trackers maintain per-participant temporal state across frames.

### BlinkTracker
- Counts blinks using EAR threshold crossing (0.21)
- Calculates **blink rate** (blinks/minute) over a rolling window
- Computes **PERCLOS** (Percentage of Eye Closure): fraction of last 30 frames where EAR < threshold
- PERCLOS > 0.4 → drowsiness alert

### HeadTracker
- Tracks head pose (yaw, pitch) velocity between consecutive frames
- High velocity indicates restlessness; low velocity with good gaze indicates focus

### AudioTracker
- Classifies **vocal energy**: silent (< 5), quiet (< 20), moderate (< 50), high (≥ 50)
- Classifies **speech pace** based on energy change rate: silent, slow, moderate, fast

## Stage 4: Emotion Classifier (9 States)

Rule-based weighted scoring system with 9 emotion categories:

| Emotion | Key Signals |
|---------|-------------|
| **Happy** | High smile (> 0.55), open eyes |
| **Surprised** | Wide eyes (EAR > 0.32), open mouth (MAR > 0.35), raised brows |
| **Focused** | Good gaze (> 0.6), normal EAR, moderate features, quiet audio |
| **Confused** | Raised brows (> 0.5), slight frown, moderate mouth opening |
| **Neutral** | Intermediate ranges for all features |
| **Sad** | Low smile (< 0.35), low brows (< 0.40) |
| **Angry** | Low brows (< 0.35), closed mouth, no smile |
| **Fearful** | Wide eyes, raised brows, no smile |
| **Disgusted** | No smile, open mouth, low brows |

Each frame produces the highest-scoring emotion and a confidence value (score / total).

## Stage 5: Attention Classifier (4 States)

Hierarchical rule-based classifier:

```
1. IF |yaw| > 0.25 OR |pitch| > 0.25 → AWAY
2. IF drowsiness > 0.4 OR (EAR < 0.20 AND blink_rate > 25) → DROWSY
3. IF gaze < 0.4 OR |yaw| > 0.15 → DISTRACTED
4. OTHERWISE → FOCUSED
```

## Stage 6: Engagement Model (GradientBoosting)

### Model Type
`sklearn.ensemble.GradientBoostingRegressor`

### Training
- **Samples**: 5,000 synthetic data points
- **Random State**: 42 (deterministic)
- **Hyperparameters**: 120 trees, max_depth=6, learning_rate=0.1, subsample=0.8

### Feature Vector (10 dimensions)

| Index | Feature | Range | Weight Direction |
|-------|---------|-------|-----------------|
| 0 | face_detected | 0/1 | ↑ engagement |
| 1 | EAR | 0.15-0.40 | ↑ engagement (eyes open) |
| 2 | smile | 0.10-0.90 | ↑ engagement |
| 3 | |yaw| | 0-0.50 | ↓ engagement (looking away) |
| 4 | |pitch| | 0-0.40 | ↓ engagement |
| 5 | audio_level (normalised) | 0-1.0 | ↑ engagement (speaking) |
| 6 | gaze_score | 0.1-1.0 | ↑ engagement |
| 7 | blink_rate (normalised) | 0-1.0 | Optimal at 0.5 |
| 8 | head_velocity | 0-2.0 | ↓ engagement (restless) |
| 9 | drowsiness | 0-0.8 | ↓ engagement |

### Synthetic Data Generation Formula

```
score = 30
      + EAR × 35
      + smile × 20
      - |yaw| × 30
      - |pitch| × 15
      + audio × 15
      + gaze × 20
      - |blink_norm - 0.5| × 10
      - head_velocity × 8
      - drowsiness × 25
      + N(0, 3.5)    # Gaussian noise
```

No-face samples: uniform random [0, 15].

### Output
Integer score clamped to [0, 100].

## Key Thresholds (config.py)

| Threshold | Value | Purpose |
|-----------|-------|---------|
| `EAR_BLINK_THRESHOLD` | 0.21 | EAR below this = eye closed (blink) |
| `PERCLOS_WINDOW` | 30 frames | Rolling window for drowsiness |
| `LOW_ENGAGEMENT_THRESHOLD` | 40 | Score below this triggers alert |
| `DROWSINESS_ALERT_THRESHOLD` | 0.5 | PERCLOS above this = drowsy |
| `AUDIO_SPEAKING_THRESHOLD` | 15 | Audio level above this = speaking |
| `BLINK_RATE_NORMALIZE` | 30.0 | 30 bpm = 1.0 normalised |

## References

- **PERCLOS**: Percentage of Eye Closure — Dinges & Grace (1998), widely used drowsiness metric
- **EAR**: Soukupová, T. & Čech, J. (2016). "Real-Time Eye Blink Detection using Facial Landmarks"
- **Facial Action Coding System (FACS)**: Ekman & Friesen (1978) — basis for emotion classification
- **MediaPipe Face Mesh**: Kartynnik et al. (2019), Google Research — 478-point face landmark model
- **GradientBoosting**: Friedman, J.H. (2001). "Greedy function approximation: A gradient boosting machine"
