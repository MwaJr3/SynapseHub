"""Stage 5: quests, the XP ledger, seasons, and the anti-farming rules.

The tests are grouped by the thing they defend:

* **the formula** — a number that can be reproduced and explained;
* **farming** — replay, one-claim-per-season, diminishing returns, the daily cap,
  and evidence that must exist before it can be paid for;
* **obsession** — a time cap that pauses without punishing, and no absence penalty
  anywhere in the model;
* **tenancy** — one learner's ledger is invisible to another.

Where a rule lives in the database (the idempotency unique constraint, the
non-negative XP check) the test goes through the database as well as the API.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.exc import IntegrityError

from app import config, gamification
from app.database import SessionLocal
from app.models import LearningSession, Quest, QuestProgress, RetrievalAttempt, Season, User, XpEntry


def learner_id(client) -> str:
    response = client.get("/api/auth/me")
    assert response.status_code == 200, response.text
    return response.json()["email"]


def user_row(client) -> User:
    email = learner_id(client)
    with SessionLocal() as db:
        return db.query(User).filter(User.email == email).one()


def record_attempts(client, concept_id: str, count: int) -> None:
    """Create real retrieval attempts through the public API."""
    for index in range(count):
        prompt = client.get(f"/api/review/{concept_id}/prompt", params={"seed": index})
        assert prompt.status_code == 200, prompt.text
        body = prompt.json()
        payload = {"prompt_id": body["prompt_id"], "answer": "a remembered answer", "latency_ms": 900}
        if body["format"] == "multiple_choice":
            payload["choice_index"] = 0
        elif body["format"] != "cloze":
            # Self-graded recall: an empty list is a valid answer and still records a
            # real attempt, which is all evidence counting asks for.
            payload["checked"] = []
        response = client.post("/api/review/attempts", json=payload)
        assert response.status_code == 201, response.text


def claim(client, slug: str, key: str):
    return client.post(f"/api/quests/{slug}/claim", headers={"Idempotency-Key": key})


def prepare(client, slug: str, concept_ids: list[str], attempts: int) -> None:
    assert client.post(f"/api/quests/{slug}/accept").status_code == 200
    for concept_id in concept_ids:
        record_attempts(client, concept_id, attempts)
    done = client.post(f"/api/quests/{slug}/complete")
    assert done.status_code == 200, done.text


# --------------------------------------------------------------------- the formula


def test_the_formula_rounds_half_up_and_is_reproducible():
    # 10 × 1 × 1 × 1 × 0.55 = 5.5 → 6. Banker's rounding would give 4 for 3.5 and 6
    # for 5.5 depending on parity, which is not a number anyone can predict.
    assert gamification.award(10, 1.0, 1.0, 1.0, 0.55) == 6
    assert gamification.award(20, 1.15, 1.25, 1.2, 0.9) == 31
    assert gamification.award(25, 1.0, 1.0, 1.0, 1.0) == 25
    # The same inputs give the same answer every time it is asked.
    assert gamification.award(20, 1.15, 1.25, 1.2, 0.9) == gamification.award(20, 1.15, 1.25, 1.2, 0.9)


def test_every_award_stores_the_factors_that_produced_it(client, learner):
    prepare(client, "exception-drill", ["py.exceptions"], 3)
    response = claim(client, "exception-drill", "factor-key-0001")
    assert response.status_code == 200, response.text
    entry = response.json()["entry"]
    assert entry["xp"] > 0
    assert entry["base_xp"] == 35
    assert set(entry["factors"]) == {"difficulty", "challenge", "strategic", "evidence"}
    for value in entry["factors"].values():
        assert value > 0
    assert "base 35" in entry["reason"]
    # The stored number really is the formula applied to the stored factors.
    product = (
        entry["base_xp"]
        * entry["factors"]["difficulty"]
        * entry["factors"]["challenge"]
        * entry["factors"]["strategic"]
        * entry["factors"]["evidence"]
    )
    assert entry["xp"] <= int(product + 0.5)


# ------------------------------------------------------------------- the handshake


def test_listing_quests_opens_a_season(client, learner):
    response = client.get("/api/quests")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["season"]["id"].startswith("s")
    assert len(body["season"]["id"]) == 4
    assert len(body["quests"]) >= 5
    assert {quest["state"] for quest in body["quests"]} == {"available"}
    assert body["guardrails"]["absence_penalty"] is False


def test_a_claim_without_evidence_is_refused_in_plain_words(client, learner):
    client.post("/api/quests/exception-drill/accept")
    response = claim(client, "exception-drill", "no-evidence-key-01")
    assert response.status_code == 409
    assert "complete its evidence" in response.json()["detail"]


def test_completing_without_the_attempts_says_how_many_are_missing(client, learner):
    client.post("/api/quests/exception-drill/accept")
    record_attempts(client, "py.exceptions", 1)
    response = client.post("/api/quests/exception-drill/complete")
    assert response.status_code == 409
    assert "needs 3" in response.json()["detail"]
    assert "has 1" in response.json()["detail"]


def test_real_attempts_complete_and_pay(client, learner):
    prepare(client, "exception-drill", ["py.exceptions"], 3)
    listing = client.get("/api/quests").json()["quests"]
    quest = next(item for item in listing if item["slug"] == "exception-drill")
    assert quest["state"] == "completed"
    assert quest["evidence"] == {"have": 3, "need": 3}

    response = claim(client, "exception-drill", "real-attempt-key-1")
    assert response.status_code == 200
    assert response.json()["created"] is True
    assert response.json()["entry"]["xp"] > 0


def test_a_finished_session_completes_the_reflection_quest(client, learner):
    # Accept first: the evidence that counts is the sitting that happens after the
    # learner took the quest on, not a sitting they had already finished.
    assert client.post("/api/quests/sit-and-reflect/accept").status_code == 200
    created = client.post(
        "/api/sessions",
        json={
            "concept_id": "py.variables",
            "objective": "Understand rebinding",
            "stopping_condition": "Can explain rebinding in one sentence",
            "planned_minutes": 25,
            "activities": ["retrieval"],
        },
    )
    assert created.status_code == 201, created.text
    session_id = created.json()["id"]
    finished = client.post(
        f"/api/sessions/{session_id}/finish",
        json={
            "outcome": "completed",
            "reflection": "Rebinding is a name pointing at a newer object.",
            "minutes_spent": 22,
        },
    )
    assert finished.status_code == 200, finished.text

    completed = client.post("/api/quests/sit-and-reflect/complete")
    assert completed.status_code == 200, completed.text
    assert claim(client, "sit-and-reflect", "reflection-key-01").json()["entry"]["xp"] > 0


# ----------------------------------------------------------------------- farming


def test_the_same_idempotency_key_never_awards_twice(client, learner):
    prepare(client, "exception-drill", ["py.exceptions"], 3)
    first = claim(client, "exception-drill", "same-key-abcdef")
    assert first.status_code == 200 and first.json()["created"] is True
    xp_after_first = client.get("/api/xp").json()["total"]

    replay = claim(client, "exception-drill", "same-key-abcdef")
    assert replay.status_code == 200
    assert replay.json()["created"] is False
    assert replay.json()["entry"]["id"] == first.json()["entry"]["id"]
    assert client.get("/api/xp").json()["total"] == xp_after_first


def test_the_database_also_refuses_a_duplicate_key(client, learner):
    """The API checks first; the unique constraint is what survives a race."""
    prepare(client, "exception-drill", ["py.exceptions"], 3)
    assert claim(client, "exception-drill", "race-key-abcdef").status_code == 200
    user = user_row(client)
    with SessionLocal() as db:
        season = db.query(Season).order_by(Season.starts_at.desc()).first()
        entry = db.query(XpEntry).filter(XpEntry.user_id == user.id).first()
        duplicate = XpEntry(
            user_id=user.id,
            season_id=season.id,
            quest_id=entry.quest_id,
            idempotency_key="race-key-abcdef",
            kind="quest",
            base_xp=1,
            xp=1,
            reason="duplicate",
        )
        db.add(duplicate)
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()


def test_the_database_refuses_a_second_award_for_the_same_quest(client, learner):
    """The state column is not the guard; the row constraint is.

    Two requests with two different keys can both read `completed` before either
    writes. This is the row that makes the second one fail, so the rule survives a
    concurrent pair of claims rather than only a sequential retry.
    """
    prepare(client, "exception-drill", ["py.exceptions"], 3)
    assert claim(client, "exception-drill", "race-a-abcdef").status_code == 200
    user = user_row(client)
    with SessionLocal() as db:
        entry = db.query(XpEntry).filter(XpEntry.user_id == user.id).one()
        db.add(
            XpEntry(
                user_id=user.id,
                season_id=entry.season_id,
                quest_id=entry.quest_id,
                idempotency_key="race-b-abcdef",
                kind="quest",
                base_xp=entry.base_xp,
                xp=entry.xp,
                reason="a second award the schema must refuse",
            )
        )
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()


def test_a_second_key_cannot_reclaim_the_same_quest(client, learner):
    prepare(client, "exception-drill", ["py.exceptions"], 3)
    assert claim(client, "exception-drill", "first-key-abcdef").status_code == 200
    again = claim(client, "exception-drill", "second-key-abcdef")
    assert again.status_code == 409
    assert "already been claimed" in again.json()["detail"]


def test_a_short_idempotency_key_is_refused(client, learner):
    prepare(client, "exception-drill", ["py.exceptions"], 3)
    response = claim(client, "exception-drill", "short")
    assert response.status_code == 422
    assert "Idempotency-Key" in response.json()["detail"]


def test_repeating_a_concept_on_the_same_day_pays_less(client, learner):
    """A second award for the same concept is paid at 60%, and says so."""
    with SessionLocal() as db:
        for quest_id, slug in (("quest-repeat", "repeat-variables"), ("quest-repeat-2", "repeat-variables-twice")):
            db.add(
                Quest(
                    id=quest_id,
                    slug=slug,
                    title="Variables again",
                    summary="Same concept, another pass.",
                    kind="retrieval",
                    concept_ids=["py.variables"],
                    difficulty=1,
                    base_xp=20,
                    min_evidence=1,
                )
            )
        db.commit()

    # The first quest today on py.variables is paid in full, whatever its size.
    prepare(client, "first-recall", ["py.variables"], 1)
    assert claim(client, "first-recall", "repeat-key-0-abcdef").json()["entry"]["xp"] > 0

    prepare(client, "repeat-variables", ["py.variables"], 1)
    response = claim(client, "repeat-variables", "repeat-key-abcdef")
    assert response.status_code == 200, response.text
    entry = response.json()["entry"]
    assert "diminishing return" in entry["reason"]
    assert "0.6" in entry["reason"]

    # A third pass on the same concept on the same day is worth 30%.
    prepare(client, "repeat-variables-twice", ["py.variables"], 1)
    third = claim(client, "repeat-variables-twice", "repeat-key-2-abcdef").json()["entry"]
    assert "0.3" in third["reason"]


def test_the_daily_cap_pays_what_fits_and_explains_the_rest(client, learner, monkeypatch):
    monkeypatch.setattr(config, "XP_DAILY_CAP", 30)
    prepare(client, "exception-drill", ["py.exceptions"], 3)
    first = claim(client, "exception-drill", "cap-key-1-abcdef")
    assert first.status_code == 200
    awarded = first.json()["entry"]["xp"]
    assert awarded <= 30

    # Fill the cap with a ledger row written directly, then claim again.
    user = user_row(client)
    with SessionLocal() as db:
        season = gamification.ensure_season(db, gamification.utcnow())
        db.add(
            XpEntry(
                user_id=user.id,
                season_id=season.id,
                idempotency_key="filler-key-abcdef",
                kind="adjustment",
                base_xp=30,
                xp=30 - awarded,
                reason="filler for the cap test",
            )
        )
        db.commit()

    prepare(client, "first-recall", ["py.variables"], 1)
    capped = claim(client, "first-recall", "cap-key-2-abcdef")
    assert capped.status_code == 200
    assert capped.json()["entry"]["xp"] == 0
    assert "daily cap reached" in capped.json()["entry"]["reason"]
    assert capped.json()["guardrails"]["capped"] is True


def test_evidence_cannot_be_faked_by_editing_the_state(client, learner):
    """`claim` re-checks the attempts, so a hand-edited `completed` pays nothing."""
    user = user_row(client)
    client.post("/api/quests/exception-drill/accept")
    with SessionLocal() as db:
        progress = (
            db.query(QuestProgress)
            .filter(QuestProgress.user_id == user.id)
            .order_by(QuestProgress.accepted_at.desc())
            .first()
        )
        progress.state = "completed"
        db.commit()
    response = claim(client, "exception-drill", "forged-state-key-1")
    assert response.status_code == 409
    assert "claim follows the work" in response.json()["detail"].lower()


def test_xp_cannot_be_negative_even_at_the_database(client, learner):
    user = user_row(client)
    with SessionLocal() as db:
        season = gamification.ensure_season(db, gamification.utcnow())
        db.add(
            XpEntry(
                user_id=user.id,
                season_id=season.id,
                idempotency_key="negative-key-abcdef",
                kind="adjustment",
                base_xp=10,
                xp=-10,
                reason="should be refused",
            )
        )
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()


# ---------------------------------------------------------------------- obsession


def test_the_time_cap_pauses_claims_without_a_penalty(client, learner, monkeypatch):
    monkeypatch.setattr(config, "MAX_DAILY_MINUTES", 60)
    user = user_row(client)
    with SessionLocal() as db:
        db.add(
            LearningSession(
                user_id=user.id,
                concept_id="py.variables",
                objective="Long sitting",
                stopping_condition="Stop at 60",
                planned_minutes=60,
                status="completed",
                minutes_spent=61,
                started_at=datetime.now(timezone.utc) - timedelta(hours=1),
                finished_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    prepare(client, "exception-drill", ["py.exceptions"], 3)
    response = claim(client, "exception-drill", "rest-key-abcdef")
    assert response.status_code == 429
    assert "Come back tomorrow" in response.json()["detail"]

    state = client.get("/api/xp").json()["today"]
    assert state["paused"] is True
    assert state["minutes_today"] >= 60
    assert state["absence_penalty"] is False


def test_there_is_no_streak_to_break(client, learner):
    """Nothing in the payload of a fresh learner can punish a gap."""
    body = client.get("/api/xp").json()
    assert body["total"] == 0
    assert body["today"]["absence_penalty"] is False
    assert "streak" not in str(body).lower()


# ---------------------------------------------------------------------- tenancy


def test_one_learners_ledger_is_invisible_to_another(client, learner):
    from fastapi.testclient import TestClient

    from app.main import app

    prepare(client, "exception-drill", ["py.exceptions"], 3)
    assert claim(client, "exception-drill", "mine-key-abcdef").status_code == 200
    mine = client.get("/api/xp/ledger").json()
    assert mine["count"] == 1

    with TestClient(app) as other:
        other.post(
            "/api/auth/register",
            json={
                "email": "ledger-other@example.test",
                "password": "correct horse battery",
                "display_name": "Other",
            },
        )
        assert other.get("/api/xp/ledger").json()["count"] == 0
        assert other.get("/api/xp").json()["total"] == 0
        # And they cannot claim a quest this learner already claimed: progress is
        # per learner, so their own row is separate and still needs their evidence.
        assert claim(other, "exception-drill", "mine-key-abcdef").status_code == 409


# ----------------------------------------------------------------------- seasons


def test_season_windows_are_a_function_of_the_clock():
    start = gamification.ANCHOR
    first = gamification.season_window(start)
    assert first[0] == "s001"
    assert first[1] == start
    assert first[2] == start + timedelta(weeks=config.SEASON_WEEKS)

    inside = gamification.season_window(start + timedelta(weeks=config.SEASON_WEEKS, days=1))
    assert inside[0] == "s002"

    # The boundary belongs to exactly one season: the start of the next.
    edge = gamification.season_window(start + timedelta(weeks=config.SEASON_WEEKS))
    assert edge[0] == "s002"
    assert edge[1] == inside[1]


def test_creating_a_season_twice_is_a_no_op(client, learner):
    with SessionLocal() as db:
        first = gamification.ensure_season(db)
        second = gamification.ensure_season(db)
        assert first.id == second.id
        assert db.query(Season).filter(Season.id == first.id).count() == 1


def test_a_quest_can_be_claimed_again_in_a_new_season(client, learner):
    """Season boundaries partition progress; they do not erase it."""
    user = user_row(client)
    with SessionLocal() as db:
        current = gamification.ensure_season(db)
        following = Season(
            id="s900",
            name="Season 900",
            theme="test",
            starts_at=gamification.aware(current.ends_at),
            ends_at=gamification.aware(current.ends_at) + timedelta(weeks=12),
        )
        db.add(following)
        db.commit()
        quest = db.query(Quest).filter(Quest.slug == "exception-drill").one()
        old = QuestProgress(
            user_id=user.id,
            quest_id=quest.id,
            season_id=current.id,
            state="claimed",
        )
        db.add(old)
        db.commit()
        assert db.query(QuestProgress).filter(QuestProgress.user_id == user.id).count() == 1

    # In the following season the quest is available again, with its own row.
    with SessionLocal() as db:
        assert gamification.progress_for(db, user, quest, "s900") is None


# ------------------------------------------------------------------------ routes


def test_the_ledger_is_append_only(client, learner):
    prepare(client, "exception-drill", ["py.exceptions"], 3)
    claim(client, "exception-drill", "append-only-key-1")
    assert client.put("/api/xp/ledger", json={}).status_code == 405
    assert client.delete("/api/xp/ledger").status_code == 405
    assert client.patch("/api/xp/ledger", json={}).status_code == 405


def test_the_summary_reports_today_and_the_season(client, learner):
    prepare(client, "exception-drill", ["py.exceptions"], 3)
    awarded = claim(client, "exception-drill", "summary-key-abcdef").json()["entry"]["xp"]
    summary = client.get("/api/xp").json()
    assert summary["total"] == awarded
    assert summary["season_xp"] == awarded
    assert summary["today"]["xp_today"] == awarded
    assert summary["today"]["minutes_limit"] == config.MAX_DAILY_MINUTES
    assert summary["recent"][0]["xp"] == awarded
    season = client.get("/api/seasons/current").json()
    assert season["xp"] == awarded
    assert season["days_remaining"] >= 0


def test_an_unknown_quest_is_a_404(client, learner):
    assert client.post("/api/quests/not-a-quest/accept").status_code == 404
    assert client.get("/api/quests").status_code == 200
