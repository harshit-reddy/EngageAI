#!/bin/bash
# Downloads face-api.js model weights for local development (non-Docker)
# Run this once before starting the frontend with npm start

MODELS_DIR="$(dirname "$0")/../public/models"
mkdir -p "$MODELS_DIR"

BASE="https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights"

echo "Downloading face-api.js AI models..."
curl -sL -o "$MODELS_DIR/tiny_face_detector_model-weights_manifest.json" "$BASE/tiny_face_detector_model-weights_manifest.json"
curl -sL -o "$MODELS_DIR/tiny_face_detector_model-shard1"               "$BASE/tiny_face_detector_model-shard1"
curl -sL -o "$MODELS_DIR/face_expression_model-weights_manifest.json"   "$BASE/face_expression_model-weights_manifest.json"
curl -sL -o "$MODELS_DIR/face_expression_model-shard1"                  "$BASE/face_expression_model-shard1"

echo "Done! Models saved to $MODELS_DIR"
