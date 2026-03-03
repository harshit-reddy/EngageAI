/**
 * MediaPipe Face Mesh landmark indices for key facial regions.
 * Mirrored from backend ml/constants.py for frontend visualization.
 */

// Eye regions
export const LEFT_EYE = [362, 385, 387, 263, 373, 380];
export const RIGHT_EYE = [33, 160, 158, 133, 153, 144];

// Lip regions
export const UPPER_LIP = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
export const LOWER_LIP = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];

// Brow regions
export const LEFT_BROW = [276, 283, 282, 295, 285];
export const RIGHT_BROW = [46, 53, 52, 65, 55];

// Iris landmarks (available when num_faces >= 1 with refine_landmarks)
export const LEFT_IRIS = [468, 469, 470, 471, 472];
export const RIGHT_IRIS = [473, 474, 475, 476, 477];

// Nose bridge (useful for head pose reference)
export const NOSE_TIP = 1;
export const NOSE_BRIDGE = [6, 197, 195, 5];

// Face oval
export const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];
