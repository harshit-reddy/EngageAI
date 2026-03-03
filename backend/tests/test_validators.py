"""Tests for input validation helpers."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from validators import validate_name, validate_meeting_id, validate_text


class TestValidateName:
    def test_valid_name(self):
        assert validate_name("Alice") == "Alice"

    def test_strips_whitespace(self):
        assert validate_name("  Bob  ") == "Bob"

    def test_strips_html_tags(self):
        assert validate_name("<script>alert(1)</script>User") == "alert(1)User"

    def test_empty_string(self):
        assert validate_name("") is None

    def test_none_input(self):
        assert validate_name(None) is None

    def test_non_string(self):
        assert validate_name(123) is None

    def test_too_long(self):
        assert validate_name("A" * 51) is None

    def test_max_length_ok(self):
        name = "A" * 50
        assert validate_name(name) == name

    def test_only_tags(self):
        assert validate_name("<b></b>") is None


class TestValidateMeetingId:
    def test_valid_id(self):
        assert validate_meeting_id("A3F1C2") == "A3F1C2"

    def test_lowercase_uppercased(self):
        assert validate_meeting_id("abc123") == "ABC123"

    def test_strips_whitespace(self):
        assert validate_meeting_id("  XY9  ") == "XY9"

    def test_empty_string(self):
        assert validate_meeting_id("") is None

    def test_none_input(self):
        assert validate_meeting_id(None) is None

    def test_non_string(self):
        assert validate_meeting_id(42) is None

    def test_too_long(self):
        assert validate_meeting_id("A" * 11) is None

    def test_special_chars_rejected(self):
        assert validate_meeting_id("AB-CD") is None

    def test_spaces_in_id_rejected(self):
        assert validate_meeting_id("AB CD") is None

    def test_max_length_ok(self):
        mid = "A" * 10
        assert validate_meeting_id(mid) == mid


class TestValidateText:
    def test_valid_text(self):
        assert validate_text("Hello world") == "Hello world"

    def test_strips_html(self):
        assert validate_text("<img src=x>Hello") == "Hello"

    def test_empty_string(self):
        assert validate_text("") is None

    def test_none_input(self):
        assert validate_text(None) is None

    def test_non_string(self):
        assert validate_text(42) is None

    def test_too_long(self):
        assert validate_text("A" * 2001) is None

    def test_max_length_ok(self):
        text = "A" * 2000
        assert validate_text(text) == text

    def test_only_tags(self):
        assert validate_text("<div></div>") is None
