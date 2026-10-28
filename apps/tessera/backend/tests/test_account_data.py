"""Stage 6: taking your data out, and having it erased.

The interesting failure modes are not "does the endpoint return 200". They are:

* an export that quietly omits the table added last stage, so a learner's copy is
  incomplete in a way nothing warns them about;
* an export that includes a live session token, turning the downloaded file into a
  login;
* a delete that reports success while a row still names the learner;
* a delete that takes the shared curriculum — or another learner — with it;
* a delete that can be triggered by a stolen session alone, without the password.

Each of those has a test. The table list is read from the schema, so a new
learner-owned table fails these tests until it is handled rather than being
silently skipped.
"""

from __future__ import annotations

import secrets
from urllib.parse import parse_qs, urlparse

import pytest
from sqlalchemy import func, select

from app import account, config, integration
from app.database import Base, SessionLocal
from app.models import (
    ChessAttempt,
    ChessPuzzle,
    Concept,
    Goal,
    SourceRow,
    TutorItemRow,
    TutorThreadRow,
    User,
)

CLIENT_ID = "tamuzi-study-planner"
REDIRECT = "http://localhost:3000/api/tessera/callback"


# ------------------------------------------------------------------ fixtures


def me(client) -> User:
    email = client.get("/api/auth/me").json()["email"]
    with SessionLocal() as db:
        return db.query(User).filter(User.email == email).one()


def make_data(client, *, label: str = "stage 6") -> dict:
    """One of everything the product can record, created through its own API.

    Anything without a public route (tutor threads, goals, chess attempts) is
    written through the model, because the point here is the account boundary,
    not how each row was produced.
    """
    assessment = client.post(
        "/api/profile/assessments",
        json={
            "instrument": "icanstudy-processes",
            "reported_by": "learner",
            "administered_on": "2026-10-01",
            "scores": [
                {"axis": "process", "name": "encoding", "value": 55.0, "value_label": "", "note": ""}
            ],
        },
    )
    assert assessment.status_code == 201, assessment.text
    assessment_id = assessment.json()["id"]

    concept = client.post(
        "/api/concepts",
        json={
            "title": f"Photosynthesis {label}",
            "subject": "Biology",
            "summary": "Turning light into chemical energy.",
            "explanation": "Chlorophyll absorbs light; the light reactions make ATP and NADPH.",
            "difficulty": 3.0,
        },
    )
    assert concept.status_code == 201, concept.text
    concept_id = concept.json()["id"]

    note = client.post(
        "/api/notes",
        json={"concept_id": concept_id, "title": "Light reactions", "body": "ATP and NADPH."},
    )
    assert note.status_code == 201, note.text

    session = client.post(
        "/api/sessions",
        json={
            "concept_id": concept_id,
            "objective": "Explain the light reactions without notes.",
            "stopping_condition": "Two correct explanations in a row.",
            "planned_minutes": 20,
        },
    )
    assert session.status_code == 201, session.text

    # One graded retrieval attempt, through the real prompt → answer path, so the
    # learner model is populated by evidence rather than by a fixture.
    prompt = client.get("/api/review/py.variables/prompt", params={"seed": 1})
    assert prompt.status_code == 200, prompt.text
    body = prompt.json()
    payload = {"prompt_id": body["prompt_id"], "answer": "a bound name", "latency_ms": 800}
    if body["format"] == "multiple_choice":
        payload["choice_index"] = 0
    elif body["format"] != "cloze":
        payload["checked"] = []
    attempt = client.post("/api/review/attempts", json=payload)
    assert attempt.status_code == 201, attempt.text

    # A quest, so there is progress and a season reference.
    accepted = client.post("/api/quests/first-recall/accept")
    assert accepted.status_code == 200, accepted.text

    # Consent → code → token, the full OAuth path.
    verifier = secrets.token_urlsafe(48)
    granted = client.post(
        "/api/v1/oauth/authorize",
        json={
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT,
            "scope": "learning-summary:read",
            "state": "state-6",
            "code_challenge": integration.s256(verifier),
            "code_challenge_method": "S256",
            "decision": "grant",
        },
    )
    assert granted.status_code == 200, granted.text
    code = parse_qs(urlparse(granted.json()["redirect_url"]).query)["code"][0]
    exchanged = client.post(
        "/api/v1/oauth/token",
        json={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT,
            "code_verifier": verifier,
        },
    )
    assert exchanged.status_code == 200, exchanged.text

    user = me(client)
    with SessionLocal() as db:
        puzzle = db.query(ChessPuzzle).first()
        thread = TutorThreadRow(
            id=f"thr-{user.id[:8]}", owner=user.id, title="Why does a list alias?", payload="{}"
        )
        db.add(thread)
        db.commit()
        db.add(TutorItemRow(id=f"itm-{user.id[:8]}", thread_id=thread.id, owner=user.id, payload="{}"))
        db.add(Goal(user_id=user.id, title="Finish the Python module", concept_ids=["py.variables"]))
        if puzzle is not None:
            db.add(ChessAttempt(user_id=user.id, puzzle_id=puzzle.id, solved=True, moves_uci=[]))
        db.commit()

    return {
        "concept_id": concept_id,
        "assessment_id": assessment_id,
        "email": user.email,
        "user_id": user.id,
    }


@pytest.fixture()
def rich(client, learner):
    return make_data(client)


# ------------------------------------------------------------------- export


def test_export_requires_sign_in(client):
    assert client.get("/api/account/export").status_code == 401
    assert client.get("/api/account/delete-preview").status_code == 401
    assert client.post("/api/account/delete", json={"password": "x", "confirm_email": "y"}).status_code == 401


def test_export_names_its_format_version_and_gives_a_manifest(client, rich):
    response = client.get("/api/account/export")
    assert response.status_code == 200, response.text
    assert "application/json" in response.headers["content-type"]
    assert "attachment" in response.headers["content-disposition"]
    assert response.headers["cache-control"] == "no-store"

    bundle = response.json()
    assert bundle["format"] == account.EXPORT_FORMAT
    assert bundle["version"] == account.EXPORT_VERSION
    assert bundle["account"]["email"] == rich["email"]
    # The manifest is the proof the export is not just the tables someone remembered.
    assert bundle["rows"] == sum(bundle["manifest"].values())
    for table, count in bundle["manifest"].items():
        assert len(bundle["data"][table]) == count, table


def test_export_contains_every_learner_owned_table(client, rich):
    bundle = client.get("/api/account/export").json()
    expected = (
        {"users"}
        | ({table.name for table in account.learner_tables()} - set(account.WITHHELD_TABLES))
        | {table.name for table, _parent, _column in account.indirect_tables()}
    )
    assert set(bundle["manifest"]) == expected

    # And the rows are real: each of these carries data this test created.
    for table in (
        "assessments",
        "concepts",
        "reference_notes",
        "learning_sessions",
        "retrieval_attempts",
        "quest_progress",
        "consent_grants",
        "access_tokens",
        "tutor_threads",
        "tutor_items",
        "goals",
        "chess_attempts",
        "assessment_scores",
    ):
        assert bundle["manifest"].get(table, 0) >= 1, f"{table} missing from the export"

    # The scores are attached to the assessment, not to the account, so they would
    # be invisible to a scan for `user_id` — and absent from an export that claims
    # to contain everything.
    assert bundle["data"]["assessment_scores"][0]["assessment_id"] == rich["assessment_id"]


def test_export_never_carries_a_credential(client, rich):
    bundle = client.get("/api/account/export").json()
    text = account.bundle_json(bundle)

    # A session token would make the file a login; a password hash is a target.
    assert "session_tokens" not in bundle["data"]
    assert "password_hash" not in bundle["data"]["users"][0]
    assert all("token_hash" not in row for row in bundle["data"]["access_tokens"])
    assert all("code_hash" not in row for row in bundle["data"].get("authorization_codes", []))

    withheld = {entry["table"]: entry for entry in bundle["excluded"]}
    assert "session_tokens" in withheld and "working key" in withheld["session_tokens"]["reason"]
    assert "password_hash" in withheld["users"]["columns"]

    # The learner's own session token is nowhere in the file.
    with SessionLocal() as db:
        sessions = Base.metadata.tables["session_tokens"]
        tokens = [
            row.token
            for row in db.execute(select(sessions.c.token).where(sessions.c.user_id == rich["user_id"]))
        ]
    for token in tokens:
        assert token not in text


def test_export_is_one_learners_rows_only(client, learner):
    first = me(client)
    make_data(client, label="first")
    first_bundle = client.get("/api/account/export").json()

    # A second learner in the same database, with their own copy of the same data.
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as other_client:
        other_client.post(
            "/api/auth/register",
            json={"email": "second-stage-6@example.test", "password": "correct horse battery", "display_name": "Second"},
        )
        make_data(other_client, label="second")
        other_bundle = other_client.get("/api/account/export").json()

    assert other_bundle["account"]["email"] == "second-stage-6@example.test"
    first_ids = {row["id"] for row in first_bundle["data"]["reference_notes"]}
    second_ids = {row["id"] for row in other_bundle["data"]["reference_notes"]}
    assert first_ids and second_ids
    assert first_ids.isdisjoint(second_ids)

    # Every exported row belongs to the account it was exported for.
    for table in account.learner_tables():
        if table.name in account.WITHHELD_TABLES or table.name not in first_bundle["data"]:
            continue
        owner = account._owner_column(table)
        for row in first_bundle["data"][table.name]:
            assert row[owner.name] == first.id, table.name


def test_the_shared_catalogue_is_not_exported(client, rich):
    bundle = client.get("/api/account/export").json()
    for table in account.SHARED_CATALOGUE:
        assert table not in bundle["data"], f"{table} is shared material, not this learner's"
    assert bundle["not_yours"]["tables"] == list(account.SHARED_CATALOGUE)
    # With ten seeded concepts in the database, the export contains only the one
    # this learner wrote.
    assert len(bundle["data"]["concepts"]) == 1


# ----------------------------------------------------- schema guard (the point)


def test_every_table_is_accounted_for():
    """No table may sit outside the export/delete story by accident.

    Three ways a table can relate to a learner: it names one, it names one of their
    rows, or it is shared catalogue material that is not theirs. A table in none of
    those groups is a table nobody has decided about, and it would silently be
    neither exported nor deleted.
    """
    owned = {table.name for table in account.learner_tables()}
    indirect = {table.name for table, _parent, _column in account.indirect_tables()}
    shared = set(account.SHARED_CATALOGUE)
    unaccounted = [
        table.name
        for table in Base.metadata.sorted_tables
        if table.name != "users"
        and table.name not in owned
        and table.name not in indirect
        and table.name not in shared
    ]
    assert unaccounted == []


def test_indirect_tables_hang_off_a_parent_that_is_exclusively_theirs():
    """A shared parent would drag the catalogue into one learner's export."""
    for table, parent, column in account.indirect_tables():
        owner = account._owner_column(parent)
        assert owner is not None and not owner.nullable, (
            f"{table.name} follows {parent.name}, which is not exclusively learner-owned"
        )
        assert column.name in {fk.parent.name for fk in table.foreign_keys}


def test_every_learner_table_cascades_from_users():
    """A table that names a learner must disappear with the learner.

    Without this, a future stage could add `user_id` from habit, forget
    `ondelete="CASCADE"`, and pass every endpoint test while leaving orphans behind
    on deletion. The database is the only place this can be guaranteed.
    """
    for table in account.learner_tables():
        owners = [fk for fk in table.foreign_keys if fk.column.table.name == "users"]
        assert owners, f"{table.name} is in learner_tables() with no foreign key to users"
        for foreign_key in owners:
            assert foreign_key.ondelete == "CASCADE", (
                f"{table.name}.{foreign_key.parent.name} names a learner but does not cascade; "
                "deleting an account would leave rows behind"
            )


# -------------------------------------------------------------- delete: preview


def test_preview_counts_what_the_export_contains(client, rich):
    bundle = client.get("/api/account/export").json()
    preview = client.get("/api/account/delete-preview").json()

    assert preview["email"] == rich["email"]
    assert preview["statement"].startswith("Deleting your account removes")
    assert preview["kept"]["tables"] == list(account.SHARED_CATALOGUE)

    exported = {table: count for table, count in bundle["manifest"].items() if count}

    # The one difference is deliberate: deletion removes the sessions the logout
    # would have removed, and the export refuses to carry a working key. Everything
    # else is the same list, so a table cannot be deleted without being exportable.
    withheld_here = {t: n for t, n in preview["tables"].items() if t in account.WITHHELD_TABLES}
    assert set(withheld_here) <= set(account.WITHHELD_TABLES)
    assert preview["tables"] == {**exported, **withheld_here}
    assert preview["rows"] == sum(preview["tables"].values())


# -------------------------------------------------------------------- delete


def test_delete_refuses_a_wrong_password_and_changes_nothing(client, rich):
    before = client.get("/api/account/delete-preview").json()["rows"]
    response = client.post(
        "/api/account/delete",
        json={"password": "not-my-password", "confirm_email": rich["email"]},
    )
    assert response.status_code == 403
    assert "nothing was deleted" in response.json()["detail"]
    assert client.get("/api/account/delete-preview").json()["rows"] == before
    assert client.get("/api/auth/me").status_code == 200


def test_delete_refuses_a_mistyped_email_and_changes_nothing(client, rich):
    response = client.post(
        "/api/account/delete",
        json={"password": "correct horse battery", "confirm_email": "someone@else.test"},
    )
    assert response.status_code == 422
    assert "nothing was deleted" in response.json()["detail"]
    assert client.get("/api/auth/me").status_code == 200


def test_delete_requires_the_password_even_with_a_valid_session(client, rich):
    """A stolen session cookie is not a licence to erase someone's account.

    This is the reason deletion asks for the password at all: the session is
    enough to read, and must not be enough to destroy.
    """
    assert client.cookies.get(config.SESSION_COOKIE)

    wrong = client.post(
        "/api/account/delete",
        json={"password": "correct horse battery extra", "confirm_email": rich["email"]},
    )
    assert wrong.status_code == 403

    # An empty password never reaches the route; the model refuses it first.
    empty = client.post("/api/account/delete", json={"password": "", "confirm_email": rich["email"]})
    assert empty.status_code == 422

    assert client.get("/api/auth/me").status_code == 200
    assert client.get("/api/account/delete-preview").json()["rows"] > 0


def test_delete_removes_every_row_and_the_account(client, learner):
    make_data(client, label="delete me")
    user_id = me(client).id

    preview = client.get("/api/account/delete-preview").json()
    assert preview["rows"] > 0

    response = client.post(
        "/api/account/delete",
        json={"password": "correct horse battery", "confirm_email": me(client).email},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["deleted"] is True
    assert body["total"] == preview["rows"]
    assert "No copy was kept" in body["message"]

    with SessionLocal() as db:
        assert db.get(User, user_id) is None
        for table in account.learner_tables():
            owner = account._owner_column(table)
            remaining = db.execute(
                select(func.count()).select_from(table).where(owner == user_id)
            ).scalar_one()
            assert remaining == 0, f"{table.name} still holds {remaining} row(s)"
        # And the rows that only named one of the deleted rows. Without this the
        # check above passes while a score row points at an assessment that is gone.
        for table, parent, column in account.indirect_tables():
            assert parent.name in {t.name for t in account.learner_tables()}
            remaining = db.execute(
                select(func.count())
                .select_from(table)
                .where(column.in_(select(parent.c.id).where(account._owner_column(parent) == user_id)))
            ).scalar_one()
            assert remaining == 0, f"{table.name} still holds {remaining} row(s) through {parent.name}"


def test_delete_ends_the_session(client, learner):
    make_data(client, label="session ends")
    cookie = client.cookies.get(config.SESSION_COOKIE)
    assert cookie
    assert (
        client.post(
            "/api/account/delete",
            json={"password": "correct horse battery", "confirm_email": me(client).email},
        ).status_code
        == 200
    )
    # The cookie is cleared, and the token behind it is gone even if replayed.
    assert client.get("/api/auth/me").status_code == 401
    client.cookies.set(config.SESSION_COOKIE, cookie)
    assert client.get("/api/auth/me").status_code == 401


def test_delete_takes_the_grants_and_the_tokens_with_it(client, learner):
    make_data(client, label="tokens")
    user_id = me(client).id
    client.post(
        "/api/account/delete",
        json={"password": "correct horse battery", "confirm_email": me(client).email},
    )
    with SessionLocal() as db:
        for table in ("consent_grants", "access_tokens", "authorization_codes"):
            model_table = Base.metadata.tables[table]
            count = db.execute(
                select(func.count()).select_from(model_table).where(model_table.c.user_id == user_id)
            ).scalar_one()
            assert count == 0, table


def test_deleting_one_account_leaves_the_curriculum_and_everyone_else(client, learner):
    with SessionLocal() as db:
        concepts_before = db.query(Concept).filter(Concept.owner_id.is_(None)).count()
        sources_before = db.query(SourceRow).count()

    make_data(client, label="to erase")
    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as survivor:
        survivor.post(
            "/api/auth/register",
            json={"email": "survivor@example.test", "password": "correct horse battery", "display_name": "Survivor"},
        )
        make_data(survivor, label="survivor")
        survivor_notes = survivor.get("/api/notes").json()["notes"]
        assert survivor_notes

        assert (
            client.post(
                "/api/account/delete",
                json={"password": "correct horse battery", "confirm_email": me(client).email},
            ).status_code
            == 200
        )

        # The survivor still reads what they wrote, and the catalogue is intact.
        assert survivor.get("/api/auth/me").status_code == 200
        assert survivor.get("/api/notes").json()["notes"] == survivor_notes

    with SessionLocal() as db:
        assert db.query(Concept).filter(Concept.owner_id.is_(None)).count() == concepts_before
        assert db.query(SourceRow).count() == sources_before


def test_a_deleted_email_can_register_again(client, learner):
    """No tombstone: deletion is deletion, not a row with a flag."""
    make_data(client, label="again")
    email = me(client).email
    client.post("/api/account/delete", json={"password": "correct horse battery", "confirm_email": email})

    again = client.post(
        "/api/auth/register",
        json={"email": email, "password": "correct horse battery", "display_name": "Rebuilt"},
    )
    assert again.status_code == 200, again.text
    # The new account starts empty rather than inheriting the old rows. The only
    # row a fresh sign-in creates is its own session.
    fresh = client.get("/api/account/delete-preview").json()
    assert set(fresh["tables"]) <= {"users", "session_tokens"}, fresh["tables"]
    assert client.get("/api/profile").json()["assessments"] == []
