# Security and privacy

This describes implemented protections and remaining boundaries. It is not an independent audit, compliance certification, or promise that a public service is production-ready.

## Accounts and private access

- Argon2 password hashing; passwords are not stored in plaintext. Password hashing/verification concurrency is bounded to reduce memory exhaustion. Minimum registration length is 10 characters; use long unique passwords.
- Opaque high-entropy sessions in an HttpOnly, SameSite=Lax cookie. Only a hash of the session token is stored server-side. Production requires Secure cookies over HTTPS.
- CSRF token obtained from the same-origin session bootstrap and required on mutating private requests; origin/host checks and explicit CORS allowlists provide additional defenses. Production rejects insecure origins and wildcard host/origin configuration.
- Session rotation at registration/login; previous converted-guest sessions are revoked. Logout revokes the current session; account/workspace deletion removes its sessions and private records.
- Every private source, analysis, task, export, quiz attempt, flashcard and edit operation checks ownership. An unrelated record is reported as not found, not exposed through a global ID.
- Atomic revisions prevent silent concurrent overwrites. Source originals and analyzed source segments are not overwritten by later guide edits.

There is no email verification, password reset/change flow, MFA, SSO, session-management dashboard, or administrative account impersonation feature. Email ownership is not proven. Do not describe the account module as a complete enterprise identity system. Add verified recovery/identity policy before broad public use.

## Untrusted input and model output

Supported YouTube URLs are normalized into an exact ID; requests go only to fixed official hosts. Redirect following is disabled. Video credentials require an explicit sharing allowlist, and opaque caption IDs are encoded. Transcript links cannot direct backend retrieval to arbitrary internal addresses. Provider endpoints are trusted administrator configuration, not user input.

Uploads are byte/extension/UTF-8/content validated, bounded before parsing, and stored as text rather than executed files. Request-body limits also apply before JSON/multipart parsing. Oversized input is rejected instead of clipped invisibly. Known subtitle formatting is cleaned without blindly deleting arbitrary programming literals. The immutable raw original remains available.

The learning prompt separates untrusted transcript/preferences from application rules, exposes no tools, and never includes credentials or other users' content. Output structure, source IDs, choice formats and quotations are validated with one bounded repair. These checks do **not** prove that an AI paraphrase is semantically faithful; important claims still require human checking. Source claims are not labeled independently verified.

React renders untrusted source text safely. Generated Markdown does not execute raw HTML or JavaScript; remote Markdown images are omitted to prevent tracking fetches. Only HTTP(S) links are actionable and open with safe relationship attributes. Print HTML escapes source content, contains no scripts/external assets and has a restrictive CSP. Production SPA responses set CSP, HSTS, nosniff and referrer policy. The production CSP intentionally disables external-CDN Swagger/ReDoc UI; use local development docs or `/openapi.json`.

## Abuse and operations

In-process request/expensive/authentication limits and persistent per-owner job quotas are present. Limiter key memory is bounded; Argon2 concurrency is bounded. They are not a distributed DDoS solution. Put a public deployment behind TLS and an edge limiter with request-size/time/resource limits.

The supplied runners use `--no-proxy-headers`: a client cannot select its rate-limit identity by spoofing `X-Forwarded-For`. Behind a reverse proxy, the application may see a shared peer IP; use an edge limiter keyed on the actual client and tune conservative app limits for the installation. If you deliberately enable trusted forwarded headers later, permit only known proxies and have the ingress overwrite, not append/accept, client-supplied forwarding headers. Never trust all forwarded addresses on an exposed API.

One application process is required. Monitor health, failed/queued tasks, disk/database growth, cost limits and backup restores. The API health endpoint includes database connectivity and worker state, but is not a full operational monitoring service. Runtime secrets belong in a protected environment/secret manager; they are not in the frontend, ZIP, database export or Docker build context.

## Data flow

| Data/action | Where it goes |
|---|---|
| Paste/upload, original/reviewed segments | Server database; browser memory while open |
| Local extraction | This server only; no external AI request |
| Configured AI analysis/regeneration | Source chunks/preferences/title to the configured AI endpoint; provider's own retention/terms apply |
| YouTube URL retrieval | Video ID/metadata/caption requests to Google/YouTube; configured account tokens only to official API/OAuth endpoints |
| Library search | Owned database queries, not an external embedding service |
| Notes, quiz attempts, flashcard ratings | Owned server records |
| Copy/download/print | User's clipboard/files/browser printing workflow |
| Theme | Browser localStorage and optionally server preferences; not transcript text |

There is no configured analytics, advertising pixel, mailing service or external fact-checking service. Application task/error logs deliberately omit transcript bodies, provider response bodies and exception text. Supplied app commands disable access logging so search query strings are not inadvertently logged. An operator's proxy/platform can still log IPs, paths, errors or request details; configure its policy accordingly. The Nginx example avoids query-string logging.

## Retention and deletion

Defaults: guest workspace 7 days from creation; account session 14 days; unsaved account guide 30 days without edit; saved guides until deletion. The worker purges at startup and hourly while running, not while the server is stopped. Old completed/failed tasks and unused sources are also cleaned. Quiz/card practice does not itself turn an unsaved guide into a permanent saved guide.

Registration converts the current guest and login adopts its current records; the UI discloses this. Guide deletion removes associated study activity and a source only if no other guide uses it. Account deletion requires the current password and removes owned application records. Guest deletion uses the current CSRF-protected session and confirmation UI.

Application deletion does not erase an external provider's records, already downloaded files, hosting logs, or backups. This project does not configure backup retention or encryption at rest. Operators must establish those controls, permissions, legal basis/consent and a deletion/restore policy appropriate to their users and location. Do not upload confidential material to an untrusted operator/provider.

## Security change checklist

Keep dependency audits current; validate ownership on every new route; add CSRF to every mutating private action; never render raw provider HTML; do not put secrets in `VITE_*`; test source/ref preservation and concurrent edits; use migrations and backups; document new external data transfers. Arrange a private reporting channel before operating a public service. No reporting email/domain is invented here.
