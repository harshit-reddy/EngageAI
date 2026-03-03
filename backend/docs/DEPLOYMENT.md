# EngageAI — Deployment Guide

## Prerequisites

- **Python** 3.9+ (3.10 or 3.11 recommended)
- **Node.js** 18+ and npm
- **MongoDB** 6.0+ (local or Atlas cloud)
- **Webcam** and **microphone** for participants

## Quick Start (Development)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Linux/macOS
# venv\Scripts\activate          # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and admin credentials

# Run
python app.py
```

Expected output:
```
[ML] Engagement model trained (5000 samples, GradientBoosting 120 trees)
[ML] FaceAnalyzer v6 ready (MediaPipe + GradientBoosting + Gaze + Attention)
[DB] MongoDB connected (mongodb://localhost:27017/EngageAI)
EngageAI backend v6 http://0.0.0.0:5000
LAN address         http://192.168.1.100:5000
ML engine           ACTIVE
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Access at `https://localhost:3000`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URI` | `mongodb://localhost:27017/EngageAI` | MongoDB connection string |
| `ADMIN_USER` | `admin` | Admin login username |
| `ADMIN_PASS` | `engageai` | Admin login password |
| `PORT` | `5000` | Backend server port |

## Docker Deployment

### Build and Run

```bash
# Backend
cd backend
docker build -t engageai-backend .
docker run -p 5000:5000 \
  -e MONGO_URI=mongodb://host.docker.internal:27017/EngageAI \
  -e ADMIN_USER=admin \
  -e ADMIN_PASS=your_secure_password \
  engageai-backend

# Frontend
cd frontend
docker build -t engageai-frontend .
docker run -p 3000:3000 engageai-frontend
```

## MongoDB Setup

### Local MongoDB

```bash
# Install MongoDB Community Edition
# Start the service
mongod --dbname EngageAI

# Verify connection
mongosh --eval "db.adminCommand('ping')"
```

### MongoDB Atlas (Cloud)

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user
3. Whitelist your IP
4. Copy the connection string to `.env`:
   ```
   MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/EngageAI
   ```

## Running Tests

### Backend

```bash
cd backend
pip install pytest pytest-cov
pytest -v
pytest --cov=. --cov-report=html   # with coverage report
```

### Frontend

```bash
cd frontend
npm install
npm test                # single run
npm run test:watch      # watch mode
```

## Troubleshooting

### ML Engine Unavailable

```
[WARN] ML analyzer unavailable: ...
```

**Fix**: Install ML dependencies:
```bash
pip install mediapipe opencv-python-headless numpy scikit-learn Pillow
```

On some systems, `opencv-python-headless` is required instead of `opencv-python`.

### MongoDB Connection Failed

```
[WARN] MongoDB connection failed: ...
```

**Fix**:
- Ensure MongoDB is running: `mongod` or `systemctl start mongod`
- Check `MONGO_URI` in `.env`
- For Atlas: check IP whitelist and credentials

### Camera/Microphone Not Working

- HTTPS is required for camera access in browsers (dev server uses self-signed cert)
- Accept the browser's security warning for `https://localhost:3000`
- Check browser permissions for camera and microphone

### eventlet Compatibility

If you see errors related to `monkey_patch`:
- Ensure ML imports happen BEFORE `eventlet.monkey_patch()`
- This ordering is handled in `app.py` — do not rearrange imports

## Production Considerations

- Change default admin credentials in `.env`
- Use a proper MongoDB instance with authentication
- Set up HTTPS with valid certificates
- Consider rate limiting on API endpoints
- Monitor server memory (ML model + face landmarks consume ~200MB)
