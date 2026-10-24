"""ClassConnect lifecycle, room-token, schedule-conflict and provider tests."""
import time
import types

import pytest

from app import core


def test_session_lifecycle_matrix():
    core.validate_transition("scheduled", "starting")
    core.validate_transition("starting", "live")
    core.validate_transition("live", "ended")
    core.validate_transition("failed", "scheduled")
    with pytest.raises(core.SessionError):
        core.validate_transition("scheduled", "ended")     # must pass through starting/live
    with pytest.raises(core.SessionError):
        core.validate_transition("ended", "live")
    with pytest.raises(core.SessionError):
        core.validate_transition("cancelled", "starting")


def test_room_tokens_are_signed_and_expire():
    token = core.mint_room_token(5, 9, "secret", now=1000.0)
    assert core.verify_room_token(token, "secret", now=1000.0) == (5, 9)
    with pytest.raises(core.SessionError):
        core.verify_room_token(token, "WRONG", now=1000.0)          # tampered signature
    with pytest.raises(core.SessionError):
        core.verify_room_token(token, "secret", now=1000.0 + core.TOKEN_TTL_SECONDS + 1)  # expired
    with pytest.raises(core.SessionError):
        core.verify_room_token("garbage", "secret")


def test_schedule_conflicts():
    sessions = [
        types.SimpleNamespace(id=1, status="scheduled", start_at="2026-10-27T09:00", end_at="2026-10-27T10:00"),
        types.SimpleNamespace(id=2, status="cancelled", start_at="2026-10-27T09:30", end_at="2026-10-27T11:00"),
    ]
    assert core.find_conflicts(sessions, "2026-10-27T09:30", "2026-10-27T10:30") == [1]
    assert core.find_conflicts(sessions, "2026-10-27T10:00", "2026-10-27T11:00") == []  # touching edge is not overlap
    assert core.find_conflicts(sessions, "2026-10-28T09:00", "2026-10-28T10:00") == []


def test_provider_unavailable_is_explicit():
    import os

    os.environ.pop("CLASSCONNECT_WEBRTC_URL", None)
    os.environ.pop("CLASSCONNECT_WEBRTC_KEY", None)
    status = core.provider_status()
    assert status["available"] is False
    assert "never faked" in status["message"]
    assert "audio and text chat" in core.LOW_BANDWIDTH_POLICY["video"]


def test_poll_vote_validation():
    votes = core.poll_vote("{}", "Yes", ["Yes", "No"])
    assert '"Yes": 1' in votes
    with pytest.raises(core.SessionError):
        core.poll_vote(votes, "Maybe", ["Yes", "No"])


def test_attendance_summary():
    rows = [types.SimpleNamespace(state="present"), types.SimpleNamespace(state="present"), types.SimpleNamespace(state="late")]
    summary = core.attendance_summary(rows)
    assert summary == {"counts": {"present": 2, "late": 1}, "total": 3}
