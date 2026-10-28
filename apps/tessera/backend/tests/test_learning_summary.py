"""The study planner integration, tested at the boundary that matters.

Every test here is about permission or isolation, not about the shape of the JSON:

* the consent screen needs a signed-in learner;
* a code is single-use, PKCE-bound, short-lived and issued only to a registered
  redirect URI;
* a token reads exactly one learner's summary, never another's, and only when the
  scope and the consent are both still valid;
* revocation takes effect on the next request;
* there is no write path at all.

The service-failure case ("Tessera is down and the planner still works") belongs to
the planner, because that is where the failure is survived. It is covered in
`company-platform` and documented in `docs/integration/study-planner-tessera.md`.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

import pytest

from app import integration
from app.database import SessionLocal
from app.models import AccessToken, AuthorizationCode, ConceptState, ConsentGrant, Goal, User

CLIENT_ID = "tamuzi-study-planner"
REDIRECT = "http://localhost:3000/api/tessera/callback"


def new_verifier() -> str:
    return secrets.token_urlsafe(48)


def request_of(verifier: str) -> dict:
    return {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT,
        "scope": "learning-summary:read",
        "state": "state-123",
        "code_challenge": integration.s256(verifier),
        "code_challenge_method": "S256",
    }


def grant_and_exchange(client, verifier: str | None = None) -> tuple[str, str]:
    """Run the whole flow. Returns `(code, token)` — the code is already spent."""
    verifier = verifier or new_verifier()
    response = client.post("/api/v1/oauth/authorize", json={**request_of(verifier), "decision": "grant"})
    assert response.status_code == 200, response.text
    redirect = response.json()["redirect_url"]
    code = parse_qs(urlparse(redirect).query)["code"][0]

    exchange = client.post(
        "/api/v1/oauth/token",
        json={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT,
            "code_verifier": verifier,
        },
    )
    assert exchange.status_code == 200, exchange.text
    return code, exchange.json()["access_token"]


def summary(client, token: str):
    return client.get("/api/v1/me/learning-summary", headers={"Authorization": f"Bearer {token}"})


def me(client) -> str:
    """The signed-in learner's id. The API does not expose ids, so ask the database."""
    response = client.get("/api/auth/me")
    assert response.status_code == 200, response.text
    email = response.json()["email"]
    with SessionLocal() as db:
        return db.query(User).filter(User.email == email).one().id


def test_the_consent_screen_requires_a_signed_in_learner(client, learner):
    # A fresh client has no session cookie, so it cannot even describe the grant.
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as stranger:
        preview = stranger.get(
            "/api/v1/oauth/consent",
            params={"client_id": CLIENT_ID, "redirect_uri": REDIRECT},
        )
    assert preview.status_code == 401


def test_the_preview_states_the_purpose_and_the_limits(client, learner):
    preview = client.get(
        "/api/v1/oauth/consent",
        params={"client_id": CLIENT_ID, "redirect_uri": REDIRECT},
    )
    assert preview.status_code == 200, preview.text
    body = preview.json()
    assert body["client"]["name"] == "Tamuzi Study Planner"
    assert body["scopes"] == ["learning-summary:read"]
    assert body["can_write"] is False
    assert body["revocable"] is True
    assert body["already_granted"] is False
    assert "read-only" in body["purpose"]
    assert "cannot modify" in body["purpose"]


def test_declining_returns_access_denied_and_grants_nothing(client, learner):
    response = client.post(
        "/api/v1/oauth/authorize",
        json={**request_of(new_verifier()), "decision": "deny"},
    )
    assert response.status_code == 200
    redirect = response.json()["redirect_url"]
    query = parse_qs(urlparse(redirect).query)
    assert query["error"] == ["access_denied"]
    assert "code" not in query
    assert query["state"] == ["state-123"]
    with SessionLocal() as db:
        assert db.query(ConsentGrant).filter(ConsentGrant.user_id == me(client)).count() == 0


def test_granting_returns_a_code_for_the_registered_redirect(client, learner):
    verifier = new_verifier()
    response = client.post(
        "/api/v1/oauth/authorize", json={**request_of(verifier), "decision": "grant"}
    )
    assert response.status_code == 200
    redirect = response.json()["redirect_url"]
    assert redirect.startswith(REDIRECT)
    query = parse_qs(urlparse(redirect).query)
    assert query["state"] == ["state-123"]
    assert query["code"][0]
    with SessionLocal() as db:
        grant = db.query(ConsentGrant).filter(ConsentGrant.user_id == me(client)).one()
        assert grant.scopes == ["learning-summary:read"]
        assert grant.revoked_at is None
        stored = (
            db.query(AuthorizationCode)
            .filter(AuthorizationCode.user_id == me(client))
            .order_by(AuthorizationCode.created_at.desc())
            .first()
        )
        # The code is stored as a digest, never in the clear.
        assert stored.code_hash != query["code"][0]
        assert stored.used_at is None


def test_the_code_exchanges_for_a_one_hour_read_only_token(client, learner):
    verifier = new_verifier()
    response = client.post(
        "/api/v1/oauth/authorize", json={**request_of(verifier), "decision": "grant"}
    )
    code = parse_qs(urlparse(response.json()["redirect_url"]).query)["code"][0]
    exchange = client.post(
        "/api/v1/oauth/token",
        json={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT,
            "code_verifier": verifier,
        },
    )
    assert exchange.status_code == 200, exchange.text
    body = exchange.json()
    assert body["token_type"] == "Bearer"
    assert body["expires_in"] == 3600
    assert body["scope"] == "learning-summary:read"

    payload = summary(client, body["access_token"])
    assert payload.status_code == 200, payload.text
    data = payload.json()
    assert data["source"] == "tessera"
    assert data["scope"] == "learning-summary:read"
    # Only the approved summary leaves the server.
    assert "email" not in data
    assert "password_hash" not in data
    assert set(data) == {
        "learning_objectives",
        "progress",
        "outstanding_activities",
        "strengths",
        "needs_attention",
        "updated_at",
        "generated_at",
        "source",
        "scope",
    }


def test_the_summary_is_this_learners_and_no_one_elses(client, learner):
    from fastapi.testclient import TestClient

    from app.main import app

    def signed_in(email_suffix: str):
        with TestClient(app) as other:
            registered = other.post(
                "/api/auth/register",
                json={
                    "email": f"isolation-{email_suffix}@example.test",
                    "password": "correct horse battery",
                    "display_name": "Isolation",
                },
            )
            assert registered.status_code == 200, registered.text
            token = grant_and_exchange(other)[1]
        return other, token

    first, first_token = signed_in("a")
    second, second_token = signed_in("b")

    with SessionLocal() as db:
        assert db.query(Goal).filter(Goal.user_id == me(first)).count() == 0
    # Give each learner one objective, through the real API, under their own session.
    for other, title in ((first, "Learn recursion"), (second, "Learn SQL joins")):
        created = other.post("/api/goals", json={"title": title, "concept_ids": []})
        assert created.status_code in (200, 201), created.text

    titles_a = [item["title"] for item in summary(first, first_token).json()["learning_objectives"]]
    titles_b = [item["title"] for item in summary(second, second_token).json()["learning_objectives"]]

    assert titles_a == ["Learn recursion"]
    assert titles_b == ["Learn SQL joins"]

    # A learner cannot ask for someone else's summary: there is no parameter to do it
    # with. Supplying a user id is ignored rather than honoured.
    sneaky = first.get(
        "/api/v1/me/learning-summary",
        params={"user_id": "whatever"},
        headers={"Authorization": f"Bearer {first_token}"},
    )
    assert sneaky.status_code == 200
    assert [item["title"] for item in sneaky.json()["learning_objectives"]] == ["Learn recursion"]


def test_a_wrong_verifier_is_refused(client, learner):
    verifier = new_verifier()
    response = client.post(
        "/api/v1/oauth/authorize", json={**request_of(verifier), "decision": "grant"}
    )
    code = parse_qs(urlparse(response.json()["redirect_url"]).query)["code"][0]
    exchange = client.post(
        "/api/v1/oauth/token",
        json={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT,
            "code_verifier": new_verifier(),
        },
    )
    assert exchange.status_code == 400
    assert exchange.json()["detail"]["error"] == "invalid_grant"


def test_plain_pkce_is_refused(client, learner):
    body = {**request_of(new_verifier()), "decision": "grant", "code_challenge_method": "plain"}
    response = client.post("/api/v1/oauth/authorize", json=body)
    assert response.status_code == 400
    assert response.json()["detail"]["error"] == "invalid_request"


def test_an_unregistered_redirect_uri_is_refused(client, learner):
    body = {**request_of(new_verifier()), "decision": "grant", "redirect_uri": "https://attacker.test/cb"}
    response = client.post("/api/v1/oauth/authorize", json=body)
    assert response.status_code == 400
    assert "redirect_uri" in response.json()["detail"]["error_description"]


def test_an_unsupported_scope_is_refused(client, learner):
    body = {**request_of(new_verifier()), "decision": "grant", "scope": "learning-summary:write"}
    response = client.post("/api/v1/oauth/authorize", json=body)
    assert response.status_code == 400
    assert response.json()["detail"]["error"] == "invalid_scope"


def test_a_code_is_single_use_and_reuse_revokes_the_token(client, learner):
    verifier = new_verifier()
    response = client.post(
        "/api/v1/oauth/authorize", json={**request_of(verifier), "decision": "grant"}
    )
    code = parse_qs(urlparse(response.json()["redirect_url"]).query)["code"][0]
    exchange_body = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT,
        "code_verifier": verifier,
    }
    first = client.post("/api/v1/oauth/token", json=exchange_body)
    assert first.status_code == 200
    token = first.json()["access_token"]
    assert summary(client, token).status_code == 200

    replay = client.post("/api/v1/oauth/token", json=exchange_body)
    assert replay.status_code == 400
    assert replay.json()["detail"]["error"] == "invalid_grant"
    # Replay is treated as a leak: everything that code produced is dead.
    assert summary(client, token).status_code == 401


def test_an_expired_code_is_refused(client, learner):
    verifier = new_verifier()
    response = client.post(
        "/api/v1/oauth/authorize", json={**request_of(verifier), "decision": "grant"}
    )
    code = parse_qs(urlparse(response.json()["redirect_url"]).query)["code"][0]
    with SessionLocal() as db:
        record = (
            db.query(AuthorizationCode)
            .filter(AuthorizationCode.user_id == me(client))
            .order_by(AuthorizationCode.created_at.desc())
            .first()
        )
        record.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()
    exchange = client.post(
        "/api/v1/oauth/token",
        json={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT,
            "code_verifier": verifier,
        },
    )
    assert exchange.status_code == 400


def test_an_expired_token_is_rejected(client, learner):
    _, token = grant_and_exchange(client)
    with SessionLocal() as db:
        stored = (
            db.query(AccessToken)
            .filter(AccessToken.user_id == me(client))
            .order_by(AccessToken.created_at.desc())
            .first()
        )
        stored.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()
    response = summary(client, token)
    assert response.status_code == 401
    assert response.json()["detail"]["error"] == "invalid_token"


def test_a_token_without_the_scope_is_forbidden(client, learner):
    _, token = grant_and_exchange(client)
    with SessionLocal() as db:
        stored = (
            db.query(AccessToken)
            .filter(AccessToken.user_id == me(client))
            .order_by(AccessToken.created_at.desc())
            .first()
        )
        stored.scopes = ["profile:read"]
        db.commit()
    response = summary(client, token)
    assert response.status_code == 403
    assert response.json()["detail"]["error"] == "insufficient_scope"


def test_a_missing_or_forged_token_is_unauthorised(client, learner):
    assert client.get("/api/v1/me/learning-summary").status_code == 401
    forged = client.get(
        "/api/v1/me/learning-summary", headers={"Authorization": "Bearer not-a-real-token"}
    )
    assert forged.status_code == 401


def test_disconnecting_revokes_access_immediately(client, learner):
    _, token = grant_and_exchange(client)
    assert summary(client, token).status_code == 200

    listed = client.get("/api/v1/me/consents")
    assert listed.status_code == 200
    assert [entry["client_id"] for entry in listed.json()["connections"]] == [CLIENT_ID]

    disconnected = client.delete(f"/api/v1/me/consents/{CLIENT_ID}")
    assert disconnected.status_code == 200
    assert disconnected.json()["revoked_tokens"] == 1

    assert summary(client, token).status_code == 401
    assert client.get("/api/v1/me/consents").json()["connections"] == []


def test_reconnecting_after_revocation_needs_a_new_grant(client, learner):
    _, token = grant_and_exchange(client)
    client.delete(f"/api/v1/me/consents/{CLIENT_ID}")
    assert summary(client, token).status_code == 401

    _, fresh = grant_and_exchange(client)
    assert summary(client, fresh).status_code == 200
    assert summary(client, token).status_code == 401


def test_there_is_no_write_path_on_the_summary(client, learner):
    _, token = grant_and_exchange(client)
    headers = {"Authorization": f"Bearer {token}"}
    assert client.post("/api/v1/me/learning-summary", headers=headers, json={}).status_code == 405
    assert client.put("/api/v1/me/learning-summary", headers=headers, json={}).status_code == 405
    assert client.delete("/api/v1/me/learning-summary", headers=headers).status_code == 405
    # And no learning record moved as a side effect of reading.
    with SessionLocal() as db:
        before = db.query(ConceptState).count()
        for _ in range(3):
            client.get("/api/v1/me/learning-summary", headers=headers)
        after = db.query(ConceptState).count()
    assert before == after


def test_a_revoked_token_cannot_be_repossessed(client, learner):
    _, token = grant_and_exchange(client)
    client.post("/api/v1/oauth/revoke", json={"token": token})
    assert summary(client, token).status_code == 401
    # Revoking twice is not an error and changes nothing.
    again = client.post("/api/v1/oauth/revoke", json={"token": token})
    assert again.status_code == 200


def test_missing_data_stays_missing(client, learner):
    """No evidence must never be reported as weakness — the platform invariant."""
    _, token = grant_and_exchange(client)
    progress = summary(client, token).json()["progress"]
    assert progress["concepts_tracked"] == 0
    assert progress["concepts_reviewed"] == 0
    assert progress["average_mastery"] is None
    body = summary(client, token).json()
    assert body["needs_attention"] == []
    assert body["strengths"] == []
    assert body["updated_at"] is None


def test_a_second_visit_reports_that_access_is_already_granted(client, learner):
    grant_and_exchange(client)
    preview = client.get(
        "/api/v1/oauth/consent",
        params={"client_id": CLIENT_ID, "redirect_uri": REDIRECT},
    )
    assert preview.status_code == 200
    assert preview.json()["already_granted"] is True
