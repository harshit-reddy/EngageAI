# EngageAI Frontend — Component Architecture

## Component Tree

```
<ErrorBoundary>
  <App>
    ├── <Home>                          # Landing page
    │   ├── <JoinForm>                  # Join meeting / Admin login tabs
    │   ├── <AdminPanel>                # Admin: create meeting, view dashboard
    │   └── Privacy consent modal
    │
    ├── <MeetingRoom>                   # Active meeting view
    │   ├── <MeetingHeader>             # Meeting ID, timer, participant count
    │   ├── <VideoGrid>                 # Video tiles layout
    │   │   └── <ParticipantTile> ×N    # Individual video + engagement overlay
    │   ├── <MeetingToolbar>            # Bottom toolbar
    │   │   └── <ReactionOverlay>       # Floating emoji reactions
    │   ├── <ParticipantPanel>          # Side panel: people list
    │   ├── <ChatPanel>                 # Side panel: chat + DMs
    │   ├── <TranscriptPanel>           # Side panel: live transcript
    │   ├── <Whiteboard>               # Collaborative whiteboard
    │   └── <SummaryModal>             # End-of-meeting summary
    │
    ├── <MonitorView>                   # Host: real-time analytics
    │   ├── <TrendChart>               # Engagement over time
    │   ├── <DistributionChart>        # Score distribution
    │   ├── <EmotionTimeline>          # Emotion changes
    │   ├── <TalkTimeChart>            # Talk time per participant
    │   └── <AwayTimeChart>            # Away time breakdown
    │
    └── <Dashboard>                     # Past meetings list
        └── <MeetingDetail>            # Single meeting analytics
            ├── <TrendChart>
            ├── <DistributionChart>
            ├── <EmotionTimeline>
            ├── <TalkTimeChart>
            └── <AwayTimeChart>
  </App>
</ErrorBoundary>
```

## Directory Structure

```
src/
├── components/
│   ├── common/
│   │   ├── ErrorBoundary.jsx       # React error boundary
│   │   └── LoadingSpinner.jsx      # Reusable loading spinner
│   ├── home/
│   │   ├── Home.jsx                # Landing page orchestrator
│   │   ├── AdminPanel.jsx          # Admin controls
│   │   └── JoinForm.jsx            # Join/login tabs
│   ├── meeting/
│   │   ├── MeetingRoom.jsx         # Meeting orchestrator
│   │   ├── MeetingHeader.jsx       # Top bar
│   │   ├── SummaryModal.jsx        # End summary
│   │   └── hooks/
│   │       ├── useMeetingSocket.js # Socket event setup
│   │       └── useMeetingActions.js# Action handlers
│   ├── MeetingToolbar.jsx          # Bottom toolbar
│   ├── VideoGrid.jsx               # Video tile layout
│   ├── ParticipantTile.jsx         # Single video tile
│   ├── ParticipantPanel.jsx        # People sidebar
│   ├── ChatPanel.jsx               # Chat sidebar
│   ├── TranscriptPanel.jsx         # Transcript sidebar
│   ├── ReactionOverlay.jsx         # Floating reactions
│   ├── Whiteboard.jsx              # Canvas whiteboard
│   ├── MonitorView.jsx             # Real-time monitor
│   ├── Dashboard.jsx               # Past meetings list
│   ├── MeetingDetail.jsx           # Meeting analytics detail
│   ├── TrendChart.jsx              # Line chart (engagement)
│   ├── DistributionChart.jsx       # Bar chart (distribution)
│   ├── EmotionTimeline.jsx         # Emotion over time
│   ├── TalkTimeChart.jsx           # Horizontal bar chart
│   └── AwayTimeChart.jsx           # Away time breakdown
├── hooks/
│   ├── useFrameCapture.js          # Webcam frame capture
│   ├── useWebRTC.js                # Peer connection management
│   ├── useMediaControls.js         # Mute/video toggle
│   └── useSpeechToText.js          # Browser speech recognition
├── utils/
│   ├── formatTime.js               # Time formatting helpers
│   └── constants.js                # Shared constants
├── styles/                          # CSS modules (see STYLING_GUIDE.md)
├── api.js                           # Server URL config
├── App.jsx                          # Router / view switcher
└── main.jsx                         # React root entry
```

## Data Flow

### State Management

The app uses React's built-in state management (useState, useCallback, useRef). No external state library is used.

**App.jsx** manages top-level view state:
- `view`: Current view (home, meeting, monitor, dashboard, detail)
- `sessionId`, `name`, `role`: Meeting context
- `isAdmin`: Admin authentication state

**MeetingRoom.jsx** manages meeting state:
- Media streams (via useMediaControls, useFrameCapture)
- Participant list, chat messages, transcript lines
- Analysis results and monitoring state
- WebRTC peer connections (via useWebRTC)

### Socket.IO Communication

```
MeetingRoom.jsx
    │
    ├── useFrameCapture → emit("analyze_frame")
    │                         ← on("analysis_result")
    │
    ├── Socket events   → emit("chat_message", "reaction", etc.)
    │                   ← on("chat_message", "reaction", etc.)
    │
    └── useWebRTC      → emit("rtc_offer", "rtc_answer", "rtc_ice")
                       ← on("rtc_offer", "rtc_answer", "rtc_ice")
```

## Key Components

### MeetingRoom
The central meeting component. Manages socket connection, media streams, and all meeting state. Uses `useMeetingSocket` for event handlers and `useMeetingActions` for action callbacks.

### VideoGrid
Responsive grid layout for participant video tiles. Adjusts columns based on participant count (1-2: single column, 3-4: 2 columns, 5+: 3 columns).

### ParticipantTile
Displays a single participant's video with engagement overlay showing:
- Engagement score bar (colour-coded: green > 60, yellow > 40, red ≤ 40)
- Emotion badge
- Attention state indicator

### MonitorView
Real-time analytics dashboard for the host. Shows live charts updated every frame analysis. Displays per-participant and aggregate metrics.

### Dashboard
Lists all past meetings from MongoDB. Shows meeting metadata, participant count, and average engagement. Links to MeetingDetail for full analytics.
