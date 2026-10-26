"""ReachLearn rendering, consent, scheduling and callback tests."""
import types

import pytest

from app import core


def test_sms_segmentation_gsm_and_unicode():
    short = core.render_sms("hello")
    assert short["segments"] == 1 and short["charset"] == "GSM-7"
    long_gsm = core.render_sms("a" * 161)
    assert long_gsm["segments"] == 2 and long_gsm["charset"] == "GSM-7"
    assert all(len(p) <= 153 for p in long_gsm["parts"])
    uni = core.render_sms("é" * 71)
    assert uni["charset"] == "UCS-2" and uni["segments"] == 2


def test_ussd_limits():
    menu = core.render_ussd(["Yes", "No", "Maybe"], prefix="Ready?")
    assert "1. Yes" in menu["menu"] and menu["max_depth"] == 7
    big = core.render_ussd([f"option-{i}" for i in range(60)])
    assert big["truncated"] is True and len(big["menu"]) <= 182
    assert core.ussd_depth_ok(3) and not core.ussd_depth_ok(9)


def test_ivr_script_markers():
    script = core.render_ivr("Welcome", "2+2?", ["3", "4"])
    assert "[PAUSE]" in script and "[PRESS 1] 3" in script and "[PRESS 2] 4" in script
    assert "say STOP" in script


def test_state_machine_and_stop_wins():
    assert core.transition_state("new", "active") == "active"
    assert core.transition_state("active", "opted_out") == "opted_out"
    with pytest.raises(core.StateError):
        core.transition_state("new", "completed")
    with pytest.raises(core.StateError):
        core.transition_state("opted_out", "active", consent="no")
    assert core.transition_state("opted_out", "active", consent="yes") == "active"

    assert core.handle_inbound("STOP") == "opted_out"
    assert core.handle_inbound(" stop. ") == "opted_out"
    assert core.handle_inbound("unsubscribe") == "opted_out"
    assert core.handle_inbound("START") == "resubscribe_requested"
    assert core.handle_inbound("thanks!") == "received"


def test_quiet_hours_and_send_rules():
    assert core.quiet_hours_ok(12, 21, 7) is True
    assert core.quiet_hours_ok(22, 21, 7) is False   # wraps midnight
    assert core.quiet_hours_ok(5, 21, 7) is False
    assert core.quiet_hours_ok(9, 21, 7) is True

    sub = types.SimpleNamespace(state="active", consent="yes", quiet_start="21:00",
                                quiet_end="07:00", max_per_day=3)
    assert core.can_send(sub, "lesson", 12, 0).allowed
    assert core.can_send(sub, "nudge", 12, 0).allowed  # consent recorded → nudges allowed
    sub_no = types.SimpleNamespace(state="active", consent="no", quiet_start="21:00",
                                   quiet_end="07:00", max_per_day=3)
    assert not core.can_send(sub_no, "nudge", 12, 0).allowed
    assert "consent" in core.can_send(sub_no, "nudge", 12, 0).reason
    assert not core.can_send(sub, "lesson", 23, 0).allowed
    assert "quiet hours" in core.can_send(sub, "lesson", 23, 0).reason
    assert not core.can_send(sub, "lesson", 12, 3).allowed
    out = types.SimpleNamespace(state="opted_out", consent="no", quiet_start="21:00",
                                quiet_end="07:00", max_per_day=9)
    assert "opted out" in core.can_send(out, "lesson", 12, 0).reason


def test_webhooks_are_idempotent():
    first = core.process_webhook("uid-1", '{"status": "delivered"}', set())
    assert first == {"applied": True, "status": "delivered"}
    second = core.process_webhook("uid-1", '{"status": "delivered"}', {"uid-1"})
    assert second["applied"] is False and "idempotent" in second["reason"]
    assert core.process_webhook("", "{}", set())["applied"] is False
    assert core.process_webhook("u", "not-json", set())["applied"] is False
    assert core.process_webhook("u2", '{"status": "weird"}', set())["status"] == "unknown"


def test_simulator_never_claims_real_delivery():
    status = core.provider_status()
    assert status["simulator"] is True
    assert "never real carrier delivery" in status["message"]
    sent = core.SimulatorProvider().send("+260", "hello")
    assert "SIMULATOR" in sent["note"]
