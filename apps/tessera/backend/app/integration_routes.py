"""HTTP surface for the study planner integration (versioned under `/api/v1`).

Two audiences use these routes:

* **The learner, in Tessera**, authenticated by the existing session cookie. They
  see the consent screen, grant or decline, and later list or revoke connections.
* **The study planner, server-to-server**, authenticated by a short-lived bearer
  token obtained through the PKCE code exchange.

The learner's session cookie is never readable by the planner: the only thing that
crosses the boundary is a code (once, over a redirect) and a token (scoped, one
hour, revocable).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from . import config, integration
from .database import get_db
from .models import ConsentGrant, User
from .security import require_user

router = APIRouter(prefix="/api/v1", tags=["integration"])


class AuthorizeRequest(BaseModel):
    client_id: str = Field(max_length=64)
    redirect_uri: str = Field(max_length=500)
    scope: str = Field(default=integration.SCOPE_SUMMARY, max_length=200)
    state: str = Field(default="", max_length=200)
    code_challenge: str = Field(max_length=128)
    code_challenge_method: str = Field(default="S256", max_length=10)
    decision: str = Field(default="grant", max_length=10)


class TokenRequest(BaseModel):
    grant_type: str = Field(default="authorization_code", max_length=40)
    code: str = Field(max_length=200)
    client_id: str = Field(max_length=64)
    redirect_uri: str = Field(max_length=500)
    code_verifier: str = Field(max_length=128)


class RevokeRequest(BaseModel):
    token: str = Field(max_length=200)


def _current(request: Request, db: Session) -> User:
    return require_user(db, request.cookies.get(config.SESSION_COOKIE))


def _validate_challenge(method: str, challenge: str) -> str:
    """S256 only. `plain` is refused because it protects nothing against interception."""
    if method != "S256":
        raise HTTPException(
            400,
            detail={
                "error": "invalid_request",
                "error_description": "code_challenge_method must be S256.",
            },
        )
    if not challenge or len(challenge) < 43:
        raise HTTPException(
            400,
            detail={"error": "invalid_request", "error_description": "code_challenge is malformed."},
        )
    return challenge


@router.get("/oauth/consent")
def consent_preview(
    client_id: str,
    redirect_uri: str,
    request: Request,
    scope: str | None = None,
    db: Session = Depends(get_db),
):
    """What the learner is being asked to approve — the exact copy the screen shows.

    Returning the text from the server (rather than hard-coding it in the client)
    means the sentence stored on the grant is the sentence the learner actually read.
    """
    _current(request, db)
    client = integration.require_client(db, client_id)
    redirect = integration.require_redirect_uri(client, redirect_uri)
    scopes = integration.parse_scope(scope, client)
    user = _current(request, db)
    grant = integration.active_grant(db, user.id, client.id)
    return {
        "client": {"id": client.id, "name": client.name},
        "redirect_uri": redirect,
        "scopes": scopes,
        "purpose": integration.PURPOSE,
        "already_granted": grant is not None,
        "can_write": False,
        "revocable": True,
    }


@router.post("/oauth/authorize")
def authorize(body: AuthorizeRequest, request: Request, db: Session = Depends(get_db)):
    """Grant (or decline) and return the URL the browser should follow."""
    user = _current(request, db)
    client = integration.require_client(db, body.client_id)
    redirect = integration.require_redirect_uri(client, body.redirect_uri)
    scopes = integration.parse_scope(body.scope, client)

    if body.decision == "deny":
        return {
            "redirect_url": integration.authorization_redirect(
                redirect_uri=redirect, state=body.state, error="access_denied"
            )
        }
    if body.decision != "grant":
        raise HTTPException(400, detail={"error": "invalid_request", "error_description": "Unknown decision."})

    challenge = _validate_challenge(body.code_challenge_method, body.code_challenge)
    integration.record_grant(db, user, client, scopes)
    code = integration.issue_code(
        db, user=user, client=client, scopes=scopes, redirect_uri=redirect, challenge=challenge
    )
    return {
        "redirect_url": integration.authorization_redirect(
            redirect_uri=redirect, state=body.state, code=code
        )
    }


@router.post("/oauth/token")
def token(body: TokenRequest, db: Session = Depends(get_db)):
    """Exchange a PKCE-bound code for a one-hour, read-only bearer token."""
    if body.grant_type != "authorization_code":
        raise HTTPException(
            400,
            detail={"error": "unsupported_grant_type", "error_description": "Only authorization_code."},
        )
    record, raw = integration.exchange_code(
        db,
        code=body.code,
        client_id=body.client_id,
        redirect_uri=body.redirect_uri,
        verifier=body.code_verifier,
    )
    return {
        "access_token": raw,
        "token_type": "Bearer",
        "expires_in": int(integration.TOKEN_TTL.total_seconds()),
        "scope": " ".join(record.scopes or []),
    }


@router.post("/oauth/revoke")
def revoke(body: RevokeRequest, db: Session = Depends(get_db)):
    """Revoke a token. Always 200: a guessable oracle about token validity is a leak."""
    integration.revoke_token(db, body.token)
    return {"revoked": True}


@router.get("/me/learning-summary")
def learning_summary(request: Request, db: Session = Depends(get_db)):
    """The approved summary. Identity comes from the token, never from a parameter."""
    _, user = integration.resolve_token(db, integration.bearer_token(request))
    return integration.learning_summary(db, user)


def _grant_payload(grant: ConsentGrant, client_name: str) -> dict:
    return {
        "client_id": grant.client_id,
        "client_name": client_name,
        "scopes": list(grant.scopes or []),
        "purpose": grant.purpose,
        "granted_at": integration._iso(grant.granted_at),
        "last_used_at": integration._iso(grant.last_used_at),
        "expires_at": integration._iso(grant.expires_at),
    }


@router.get("/me/consents")
def list_consents(request: Request, db: Session = Depends(get_db)):
    """Connected apps, for the settings screen. Revoked grants are not listed."""
    user = _current(request, db)
    grants = (
        db.query(ConsentGrant)
        .filter(ConsentGrant.user_id == user.id, ConsentGrant.revoked_at.is_(None))
        .order_by(ConsentGrant.granted_at.desc())
        .all()
    )
    return {
        "connections": [
            _grant_payload(grant, integration.require_client(db, grant.client_id).name)
            for grant in grants
        ]
    }


@router.delete("/me/consents/{client_id}")
def disconnect(client_id: str, request: Request, db: Session = Depends(get_db)):
    """Withdraw access. Every token held by that client stops working immediately."""
    user = _current(request, db)
    revoked = integration.revoke_grant(db, user.id, client_id)
    return {"client_id": client_id, "revoked_tokens": revoked}
