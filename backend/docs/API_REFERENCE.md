# EngageAI — API Reference

## Base URL
```
http://localhost:5000
```

---

## REST Endpoints

### Health

#### `GET /`
Health check.

**Response**: `200 OK`
```
EngageAI backend running (v6)
```

#### `GET /network-info`
Server network information.

**Response**: `200 OK`
```json
{
  "ip": "192.168.1.100",
  "port": 5000,
  "ml": true
}
```

---

### Admin

#### `POST /admin/login`
Authenticate as admin.

**Request Body**:
```json
{
  "username": "admin",
  "password": "engageai"
}
```

**Response (success)**: `200 OK`
```json
{ "ok": true }
```

**Response (failure)**: `401 Unauthorized`
```json
{ "ok": false, "error": "Invalid credentials" }
```

---

### Sessions

#### `POST /session`
Create a new meeting session.

**Request Body**:
```json
{ "name": "Alice" }
```

**Response**: `200 OK`
```json
{ "sessionId": "A3F1C2" }
```

#### `GET /session/:sessionId`
Validate a session exists and is active.

**Response (active)**: `200 OK`
```json
{
  "_id": "A3F1C2",
  "speakerName": "Alice",
  "createdAt": 1700000000000
}
```

**Response (not found)**: `404`
```json
{ "error": "Session not found" }
```

**Response (ended)**: `410`
```json
{ "error": "Session has ended" }
```

#### `PATCH /session/:sessionId/end`
End a meeting session.

**Response**: `200 OK`
```json
{
  "ok": true,
  "summary": { ... }
}
```

#### `GET /session/:sessionId/summary`
Get session summary (if available).

**Response**: `200 OK` — summary object.

#### `POST /session/:sessionId/monitor`
Start ML monitoring for a session.

**Response**: `200 OK`
```json
{ "ok": true }
```

#### `POST /session/:sessionId/stop-monitor`
Stop ML monitoring.

**Response**: `200 OK`
```json
{ "ok": true }
```

---

### Meetings

#### `GET /meetings`
List all meetings (past and current).

**Response**: `200 OK`
```json
{
  "meetings": [
    {
      "id": "A3F1C2",
      "hostName": "Alice",
      "createdAt": 1700000000000,
      "endedAt": 1700003600000,
      "hasAnalytics": true,
      "isLive": false,
      "participantCount": 3,
      "avgEngagement": 72
    }
  ]
}
```

#### `GET /meetings/:meetingId/analytics`
Get detailed analytics for a meeting.

**Response**: `200 OK` — full analytics document.

**Response (not found)**: `404`
```json
{ "error": "No analytics found" }
```

---

### Feedback

#### `POST /feedback`
Submit participant feedback.

**Request Body**:
```json
{
  "meetingId": "A3F1C2",
  "from": "Bob",
  "message": "Great session!"
}
```

**Response**: `200 OK`
```json
{ "ok": true, "item": { ... } }
```

#### `GET /feedback/:meetingId`
Get feedback for a meeting.

**Response**: `200 OK`
```json
{
  "feedback": [
    {
      "meetingId": "A3F1C2",
      "from": "Bob",
      "message": "Great session!",
      "ts": 1700000000000
    }
  ]
}
```

---

## Socket.IO Events

### Connection

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `join` | Client → Server | `{ sessionId, name, role }` | Join a meeting room |
| `userJoined` | Server → Room | `{ id, name, role, participants[] }` | New user joined |
| `userLeft` | Server → Room | `{ id, name, participants[] }` | User disconnected |

### Analysis

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `analyze_frame` | Client → Server | `{ frame, audioLevel, meetingId, name }` | Send frame for ML analysis |
| `analysis_result` | Server → Client | `{ engagementScore, emotion, ... }` | ML analysis results |
| `monitoring_started` | Server → Room | `{ meetingId }` | ML monitoring activated |
| `monitoring_stopped` | Server → Room | `{ meetingId }` | ML monitoring deactivated |

### Media

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `media_status` | Client → Server | `{ meetingId, isMuted, isVideoOff }` | Media toggle state |
| `audio_activity` | Client → Server | `{ meetingId, level }` | Audio level update |
| `screen_share_started` | Client → Server | `{ meetingId }` | Screen sharing started |
| `screen_share_stopped` | Client → Server | `{ meetingId }` | Screen sharing stopped |

### Chat

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `chat_message` | Client → Server | `{ meetingId, text }` | Send chat message |
| `chat_message` | Server → Room | `{ from, text, ts, id }` | Broadcast chat message |
| `direct_message` | Client → Server | `{ meetingId, to, text }` | Send DM |
| `direct_message` | Server → Recipient | `{ from, text, ts }` | Deliver DM |

### Interactions

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `reaction` | Client → Server | `{ meetingId, emoji }` | Send emoji reaction |
| `reaction` | Server → Room | `{ from, emoji }` | Broadcast reaction |
| `raise_hand` | Client → Server | `{ meetingId, raised }` | Toggle hand raise |
| `hand_raised` | Server → Room | `{ id, name, raised, participants[] }` | Hand raise update |
| `mute_all` | Client → Server | `{ meetingId }` | Host mutes all (host only) |
| `mute_participant` | Client → Server | `{ meetingId, targetId }` | Host mutes specific user |

### WebRTC Signalling

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `rtc_ready` | Client → Server | `{ meetingId }` | Client ready for WebRTC |
| `rtc_offer` | Client → Server | `{ meetingId, to, offer }` | SDP offer |
| `rtc_answer` | Client → Server | `{ meetingId, to, answer }` | SDP answer |
| `rtc_ice` | Client → Server | `{ meetingId, to, candidate }` | ICE candidate |

### Whiteboard

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `whiteboard_draw` | Client → Server | `{ meetingId, line }` | Draw on whiteboard |
| `whiteboard_clear` | Client → Server | `{ meetingId }` | Clear whiteboard |

### Transcript

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `transcript_line` | Client → Server | `{ meetingId, text }` | Speech-to-text line |
| `transcript_update` | Server → Room | `{ name, text, ts }` | Broadcast transcript |

### Session

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `sessionEnded` | Server → Room | `{ summary }` | Meeting ended |
| `force_muted` | Server → Client | `{}` | You were muted by host |
