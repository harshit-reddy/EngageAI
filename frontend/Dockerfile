# ── Stage 1: Build the React app ─────────────────────────────────────
FROM node:18-alpine AS builder

RUN apk add --no-cache wget

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# ── Download face-api.js model weights ──────────────────────────────
RUN mkdir -p public/models && \
    BASE="https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights" && \
    wget -q -O public/models/tiny_face_detector_model-weights_manifest.json \
              "$BASE/tiny_face_detector_model-weights_manifest.json" && \
    wget -q -O public/models/tiny_face_detector_model-shard1 \
              "$BASE/tiny_face_detector_model-shard1" && \
    wget -q -O public/models/face_expression_model-weights_manifest.json \
              "$BASE/face_expression_model-weights_manifest.json" && \
    wget -q -O public/models/face_expression_model-shard1 \
              "$BASE/face_expression_model-shard1" && \
    echo "AI models ready"

# Prevent CRA from treating ESLint warnings as errors
ENV CI=false
ENV GENERATE_SOURCEMAP=false

RUN npm run build

# ── Stage 2: Serve with nginx ───────────────────────────────────────
FROM nginx:1.25-alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
