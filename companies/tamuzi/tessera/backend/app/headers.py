"""Response headers, applied once rather than per route.

These are cheap and mostly about what happens when something goes wrong: no MIME
sniffing, no framing (the API is never meant to be framed), no referrer leaking a
learner's page into a third party. HSTS is only sent where it is true — behind
TLS — because sending it over plain HTTP would pin a browser to https on a host
that cannot serve it.

The Content-Security-Policy is attached to documents only: the compiled frontend
loads nothing from another origin, and a JSON response has nothing to police.

Kept apart from `security.py`, which is about authenticating a learner; this file
is about what the browser is told afterwards.
"""
from __future__ import annotations

from fastapi import Request

from . import config


async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    response.headers.setdefault(
        "Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()"
    )
    if response.headers.get("content-type", "").startswith("text/html"):
        # Only the document gets a policy. Everything the built app loads is
        # same-origin, so this is a tight policy rather than a permissive one:
        # inline styles are allowed because React writes them as style attributes,
        # and nothing else is.
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
            "script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; "
            "frame-ancestors 'none'",
        )
    if config.PRODUCTION or request.url.scheme == "https":
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response
