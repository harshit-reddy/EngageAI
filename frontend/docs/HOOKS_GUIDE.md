# EngageAI Frontend — Hooks Guide

## Custom Hooks

### useMediaControls

**File**: `src/hooks/useMediaControls.js`

Controls audio and video track enabled state without re-requesting permissions.

**Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `streamRef` | `React.RefObject<MediaStream>` | Ref to the active media stream |

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| `isMuted` | `boolean` | Whether audio is muted |
| `isVideoOff` | `boolean` | Whether video is disabled |
| `toggleMute` | `() => void` | Toggle audio track enabled |
| `toggleVideo` | `() => void` | Toggle video track enabled |
| `forceMute` | `() => void` | Force audio off (used when host mutes) |

**Usage**:
```jsx
const streamRef = useRef(null);
const { isMuted, toggleMute } = useMediaControls(streamRef);
```

---

### useFrameCapture

**File**: `src/hooks/useFrameCapture.js`

Captures frames from a video element at regular intervals and emits them via Socket.IO for ML analysis.

**Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `videoRef` | `React.RefObject<HTMLVideoElement>` | Ref to the local video element |
| `socketRef` | `React.RefObject<Socket>` | Ref to the Socket.IO connection |
| `meetingId` | `string` | Current meeting ID |
| `name` | `string` | Participant name |
| `audioLevel` | `number` | Current audio level (0-100) |

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| `startCapture` | `() => void` | Begin frame capture loop |
| `stopCapture` | `() => void` | Stop frame capture |
| `isCapturing` | `boolean` | Whether capturing is active |

**Behaviour**:
- Captures at ~2 FPS (500ms interval)
- Resizes to 320px width for bandwidth
- Outputs JPEG at quality 0.6
- Skips frames if video element is not ready

---

### useWebRTC

**File**: `src/hooks/useWebRTC.js`

Manages WebRTC peer connections for multi-party video calls using mesh topology.

**Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `socketRef` | `React.RefObject<Socket>` | Socket.IO connection ref |
| `localStreamRef` | `React.RefObject<MediaStream>` | Local media stream ref |
| `meetingId` | `string` | Current meeting ID |

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| `remoteStreams` | `Map<string, MediaStream>` | Peer ID → MediaStream map |
| `startWebRTC` | `() => void` | Initialise WebRTC signalling |
| `cleanup` | `() => void` | Close all peer connections |

**Signalling Flow**:
```
A joins room → emits rtc_ready
B receives rtc_ready → creates offer → sends to A
A receives offer → creates answer → sends to B
Both exchange ICE candidates
Connection established
```

---

### useSpeechToText

**File**: `src/hooks/useSpeechToText.js`

Browser-based speech recognition using the Web Speech API.

**Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `socketRef` | `React.RefObject<Socket>` | Socket.IO connection ref |
| `meetingId` | `string` | Current meeting ID |
| `enabled` | `boolean` | Whether transcription is active |

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| `isListening` | `boolean` | Whether recognition is active |
| `start` | `() => void` | Start speech recognition |
| `stop` | `() => void` | Stop speech recognition |

**Behaviour**:
- Uses `webkitSpeechRecognition` (Chrome) or `SpeechRecognition`
- Continuous mode with interim results
- Emits `transcript_line` events on final results
- Auto-restarts on recognition end (if still enabled)

---

## Meeting-Specific Hooks

### useMeetingSocket

**File**: `src/components/meeting/hooks/useMeetingSocket.js`

Sets up all Socket.IO event listeners for the meeting room.

**Parameters**: State setters and refs from MeetingRoom

**Events Handled**:
- `userJoined`, `userLeft` — participant list updates
- `analysis_result` — ML analysis results
- `chat_message`, `direct_message` — chat events
- `reaction`, `hand_raised` — interactions
- `monitoring_started/stopped` — ML monitoring state
- `force_muted` — host mute action
- `sessionEnded` — meeting ended

---

### useMeetingActions

**File**: `src/components/meeting/hooks/useMeetingActions.js`

Provides memoised action handlers for meeting interactions.

**Actions**:
- `sendChat(text)` — send chat message
- `sendReaction(emoji)` — send emoji reaction
- `toggleHand()` — raise/lower hand
- `startAnalysis()` — begin ML monitoring (host)
- `stopAnalysis()` — stop ML monitoring (host)
- `endSession()` — end meeting for all (host)
- `sendFeedback(message)` — submit feedback (participant)
