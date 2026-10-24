"""Tests: filters, mock session flow, spaced-review boxes, timer, stats honesty."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.mocktimer import MockTimer, format_mmss
from app.store import Store


def fresh(tmp_path):
    main.store = Store(str(tmp_path / "p.db"))
    main.store.add_question(company="Acme", role="SWE", difficulty="easy", topic="arrays",
                            prompt="Two-sum?", answer_template="hash map")
    main.store.add_question(company="Globex", role="Data", difficulty="hard", topic="stats",
                            prompt="Explain p-values.", answer_template="null hypothesis")
    return TestClient(main.app)


def test_filters(tmp_path):
    c = fresh(tmp_path)
    r = c.get("/?company=Acme")
    assert "Two-sum" in r.text and "p-values" not in r.text
    r = c.get("/?role=Data&difficulty=hard")
    assert "p-values" in r.text and "Two-sum" not in r.text


def test_mock_session_with_self_scores(tmp_path):
    c = fresh(tmp_path)
    r = c.post("/mock", data={"company": "any", "role": "any", "difficulty": "", "minutes": "30"})
    assert "Mock session" in r.text
    session_id = main.store.conn.execute("SELECT MAX(id) FROM sessions").fetchone()[0]
    r = c.post(f"/mock/{session_id}/finish", data={"score_0": "4", "score_1": "abc", "notes": "felt ok"})
    assert "saved" in r.text
    scores = __import__("json").loads(main.store.conn.execute(
        "SELECT self_scores FROM sessions WHERE id=?", (session_id,)).fetchone()[0])
    assert scores == [4, 0]          # invalid entry clamped to 0, not invented


def test_spaced_review_boxes_progress():
    store = Store(":memory:")
    r1 = store.schedule(1, remembered=True)
    assert r1["box"] == 2 and r1["interval_days"] == 2
    r2 = store.schedule(1, remembered=True)
    assert r2["box"] == 3
    r3 = store.schedule(1, remembered=False)
    assert r3["box"] == 1 and r3["interval_days"] == 1    # forgotten resets to box 1
    assert "Leitner-style" in r1["schedule_note"]


def test_due_queue_lists_scheduled(tmp_path):
    c = fresh(tmp_path)
    c.post("/review/1?remembered=1")
    # Backdate the due date so the item is actually due now.
    main.store.conn.execute("UPDATE reviews SET due_at='2020-01-01T00:00:00+00:00'")
    main.store.conn.commit()
    r = c.get("/review/due")
    assert "box 2" in r.text          # remembered first review lands in box 2


def test_mock_timer_bounds():
    t = MockTimer(total_seconds=90, question_count=4)
    assert t.per_question_seconds() == 30
    assert format_mmss(125) == "02:05"
    with pytest.raises(ValueError):
        MockTimer(total_seconds=10, question_count=0).per_question_seconds()


def test_stats_label_self_estimates(tmp_path):
    c = fresh(tmp_path)
    stats = main.store.session_stats()
    assert "not verified performance" in stats["note"]
