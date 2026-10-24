"""Tests: bank validation, seeded shuffling, scoring, leaderboard ties, moderation."""
from __future__ import annotations

import json

from fastapi.testclient import TestClient

import app.main as main
from app.bank import BankError, export_bank, validate_bank
from app.store import Store, shuffled_order


def fresh(tmp_path):
    main.store = Store(str(tmp_path / "q.db"))
    return TestClient(main.app)


def test_bank_validation_reports_reasons():
    data = {"questions": [
        {"prompt": "Good?", "options": ["a", "b"], "answer_index": 0},
        {"prompt": "", "options": ["a", "b"], "answer_index": 0},
        {"prompt": "Bad index", "options": ["a", "b"], "answer_index": 5},
        {"prompt": "Missing options", "answer_index": 0},
    ]}
    valid, invalid = validate_bank(data)
    assert len(valid) == 1 and len(invalid) == 3
    assert any("empty" in r for r in invalid[0]["reasons"])
    assert any("out of range" in r for r in invalid[1]["reasons"])
    assert any("missing field" in r for r in invalid[2]["reasons"])


def test_bank_requires_questions_key():
    import pytest
    with pytest.raises(BankError):
        validate_bank({"rows": []})


def test_export_round_trips():
    qs = [{"prompt": "p", "options": json.dumps(["a", "b"]), "answer_index": 1,
           "explanation": "e", "difficulty": "easy", "tags": "t"}]
    exported = json.loads(export_bank(qs))
    valid, invalid = validate_bank(exported)
    assert len(valid) == 1 and not invalid


def test_shuffled_order_is_deterministic():
    assert shuffled_order(5, "abc") == shuffled_order(5, "abc")
    assert sorted(shuffled_order(5, "abc")) == [0, 1, 2, 3, 4]


def test_attempt_scoring_and_review(tmp_path):
    c = fresh(tmp_path)
    r = c.post("/quiz/new", data={"title": "T", "author": "ann", "description": "d"},
               follow_redirects=False)
    quiz_id = int(r.headers["location"].split("/")[2])
    c.post(f"/quiz/{quiz_id}/add", data={"prompt": "2+2?", "opt0": "3", "opt1": "4",
                                         "answer_index": "1", "explanation": "basic arithmetic"})
    c.post(f"/quiz/{quiz_id}/add", data={"prompt": "capital of France?", "opt0": "Paris", "opt1": "Rome",
                                         "answer_index": "0", "explanation": "Paris"})
    r = c.post(f"/quiz/{quiz_id}/submit", data={"player": "pat", "seed": "s1", "q0": "0", "q1": "0"})
    assert "1/2" in r.text                          # one right, one wrong
    assert "basic arithmetic" in r.text             # wrong-answer explanation shown
    assert "seed" in r.text


def test_leaderboard_rank_and_tiebreak(tmp_path):
    c = fresh(tmp_path)
    r = c.post("/quiz/new", data={"title": "T", "author": "ann"}, follow_redirects=False)
    quiz_id = int(r.headers["location"].split("/")[2])
    c.post(f"/quiz/{quiz_id}/add", data={"prompt": "q", "opt0": "a", "opt1": "b", "answer_index": "0"})
    main.store.record_attempt(quiz_id, "alice", "s", [0], 1, 1, duration_seconds=30)
    main.store.record_attempt(quiz_id, "bob", "s", [1], 0, 1, duration_seconds=10)
    main.store.record_attempt(quiz_id, "carol", "s", [0], 1, 1, duration_seconds=20)
    board = main.store.leaderboard(quiz_id)
    assert [b["player"] for b in board] == ["carol", "alice", "bob"]   # score desc, then time asc


def test_moderation_flow(tmp_path):
    c = fresh(tmp_path)
    r = c.post("/quiz/new", data={"title": "T", "author": "ann"}, follow_redirects=False)
    quiz_id = int(r.headers["location"].split("/")[2])
    c.post(f"/quiz/{quiz_id}/add", data={"prompt": "spam q", "opt0": "a", "opt1": "b", "answer_index": "0"})
    qid = main.store.conn.execute("SELECT id FROM questions").fetchone()["id"]
    c.post(f"/question/{qid}/report")
    assert len(main.store.reported_questions()) == 1
    assert len(main.store.questions(quiz_id)) == 0      # hidden from play
    c.post(f"/moderation/{qid}/restore")
    assert len(main.store.questions(quiz_id)) == 1      # restored
    c.post(f"/question/{qid}/report")
    c.post(f"/moderation/{qid}/remove")
    assert main.store.conn.execute("SELECT COUNT(*) FROM questions").fetchone()[0] == 0
