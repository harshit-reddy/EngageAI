"""
EngageAI — In-memory room state dictionaries.
Shared across routes/sockets at runtime; reset on restart.
"""

rooms = {}               # meetingId -> {sid: participant_data}
session_summaries = {}   # meetingId -> summary accumulator
transcripts = {}         # meetingId -> [lines]
socket_data = {}         # sid -> {meeting_id, role, name}
raised_hands = {}        # meetingId -> set of sids
chat_messages = {}       # meetingId -> [messages]
waiting_room = {}        # meetingId -> [{sid, name, ts}]
monitored_sessions = set()  # set of meetingIds being monitored
