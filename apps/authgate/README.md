# AuthGate — authentication & authorization dashboard (FastAPI + SQLite)

Cybersecurity catalogue **Project 15**.

## Overview
A demo identity dashboard implementing **strong password policy** (length,
character classes, common-password list, username-reuse rejection), **TOTP
MFA**, **failed-attempt lockout + rate limiting**, **role-based access**, and
**security headers**.

## Security engineering (tested)
- Passwords: PBKDF2-SHA256 (200,000 iterations), per-user random salts;
  verified with `hmac.compare_digest`.
- **Generic sign-in errors** for unknown user and wrong password (identical
  responses) — avoids username enumeration.
- **Lockout** after N failures with expiry timestamp; **fixed-window rate
  limiting** per IP and per username (bounded in-memory table).
- **CSP** `default-src 'none'` with inline styles only; `frame-ancestors 'none'`
  / X-Frame-Options DENY; nosniff; no-referrer; `no-store`.
- **HSTS** only behind HTTPS — emitted via `security_headers(include_hsts=True)`
  and documented in `.env.example` (mixed-content rule noted).
- Sessions are server-side with expiry; logout deletes the session row.
- Role checks return **403** (not a redirect) for wrong-role access.

## DSA/performance note
Password hashing is deliberately expensive (`PBKDF2_ITERATIONS = 200_000`) —
the cost is the security feature; login rate limiting bounds repeated hashing.
Session lookup is an indexed SQLite primary-key read `O(1)`.

## Run
```bash
uvicorn app.main:app --port 8016     # http://localhost:8016
```

## Testing
`python3 -m pytest tests/ -q` — policy rejections, hash round-trip, generic
errors, lockout, MFA gates, role 403s, headers, session invalidation.

## Limitations
Single-process demo (rate limiter in memory); no password reset flow; MFA
secret displayed at enable time for demo convenience.

## Future improvements
WebAuthn, password reset with single-use tokens, audit log export, session
listing/revocation UI.
