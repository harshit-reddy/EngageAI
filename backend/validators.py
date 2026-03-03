"""
EngageAI — Input validation helpers.
"""

import re

_TAG_RE = re.compile(r"<[^>]+>")
MAX_NAME_LEN = 50
MAX_MEETING_ID_LEN = 10
MAX_TEXT_LEN = 2000


def validate_name(name):
    """Return sanitised name or None if invalid."""
    if not name or not isinstance(name, str):
        return None
    name = _TAG_RE.sub("", name).strip()
    if not name or len(name) > MAX_NAME_LEN:
        return None
    return name


def validate_meeting_id(meeting_id):
    """Return upper-cased meeting ID or None if invalid."""
    if not meeting_id or not isinstance(meeting_id, str):
        return None
    meeting_id = meeting_id.strip().upper()
    if not meeting_id or len(meeting_id) > MAX_MEETING_ID_LEN:
        return None
    if not re.match(r"^[A-Z0-9]+$", meeting_id):
        return None
    return meeting_id


def validate_text(text):
    """Return sanitised text or None if invalid."""
    if not text or not isinstance(text, str):
        return None
    text = _TAG_RE.sub("", text).strip()
    if not text or len(text) > MAX_TEXT_LEN:
        return None
    return text
