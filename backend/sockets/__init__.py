"""Register all Socket.IO event handlers."""

from .connection import register as reg_connection
from .media import register as reg_media
from .chat import register as reg_chat
from .interaction import register as reg_interaction
from .webrtc import register as reg_webrtc
from .whiteboard import register as reg_whiteboard
from .transcript import register as reg_transcript
from .analysis import register as reg_analysis
from .lobby import register as reg_lobby


def register_sockets(socketio, analyzer=None):
    reg_connection(socketio)
    reg_media(socketio)
    reg_chat(socketio)
    reg_interaction(socketio)
    reg_webrtc(socketio)
    reg_whiteboard(socketio)
    reg_transcript(socketio)
    reg_analysis(socketio, analyzer)
    reg_lobby(socketio)
