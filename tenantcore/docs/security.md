# Security model and threat review

## Security objective

The primary objective is tenant confidentiality and integrity even when an application developer makes an isolation mistake. TenantCore layers identity, membership, role/scope authorization, relational constraints, RLS, audit evidence, and operational secret controls. No single layer is treated as infallible.

## Controls

### Authentication

- Passwords use Argon2 through `pwdlib`; unknown-user verification performs dummy hash work.
- Access tokens are signed JWTs with issuer, audience, issued-at/not-before/expiry, session ID, and unique token ID. They expire after 15 minutes by default.
- Refresh credentials are high-entropy opaque values. Only SHA-256 hashes are persisted, each use rotates the token, and logout revokes the persisted session.
- Users and sessions are checked on every request, so deactivated users/revoked sessions do not remain valid until JWT expiry.
- Invitations use expiring one-time random tokens stored as hashes. Acceptance clears the token and activates the membership.

### API credentials

- Keys have a public prefix and high-entropy secret; only the secret hash is stored and the plaintext is returned once.
- `X-API-Key` authentication performs a narrow prefix lookup in trusted backend code, constant-time hash comparison, expiry/revocation checks, and user/tenant/membership validation.
- API keys never receive platform-admin authority and cannot call account-session management endpoints.
- Membership roles still apply. `read` scope permits safe methods only; `write` is required for mutations. Revocation and `last_used_at` are real database state.

### Authorization and isolation

- Platform administrator is a server-side user attribute checked on protected control-plane routes.
- Roles (`tenant_admin`, `manager`, `member`, `read_only`) are membership-specific, not global.
- Tenant selection is verified against active membership. Tenant status is checked again by RLS.
- Client body/query/header tenant IDs do not establish membership. IDs are parsed/validated and resource responses avoid cross-tenant existence details.
- RLS and composite foreign keys enforce final row/relationship boundaries under the restricted runtime role.

## Threat matrix

| Threat | Mitigation | Residual concern |
|---|---|---|
| Missing tenant WHERE clause | RLS USING and WITH CHECK | Policy must exist on every tenant table |
| Malicious tenant switch | Server membership check + RLS | Legitimate multi-tenant users are allowed only listed memberships |
| Cross-tenant foreign key | Composite `(tenant_id, relationship_id)` FKs | Global control-plane relations need separate review |
| Member role escalation | Server role dependencies, membership role checks | Keep permission matrix reviewed as routes grow |
| Suspended tenant access | Context status check + active-tenant RLS guard | Existing response data already delivered cannot be recalled |
| SQL injection | ORM/parameterized values, validated UUIDs, no frontend DB access | Identifier interpolation only in strict UUID-derived alternative helper |
| Stolen refresh token | Rotation, hashes, persisted revocation | Refresh reuse detection can be strengthened with theft alerts/family revocation |
| XSS/token theft | Short-lived tokens, sessionStorage, framework escaping | Production should use BFF/HttpOnly cookie + CSRF and strict CSP |
| Credential brute force | Argon2 + Redis IP/email fixed-window limit | Distributed rate limits/CAPTCHA/WAF may be needed under attack |
| Audit tampering | No runtime UPDATE/DELETE grants, deny policies, triggers | Migration/superuser remains trusted; ship logs externally for stronger evidence |
| Sensitive error leakage | Stable error envelopes, server-side error-type logs | Ensure logs avoid request bodies/secrets |
| Background tenant confusion | Explicit UUID task args, fresh transaction, RLS | Non-idempotent future jobs need deduplication/outbox design |
| Dependency vulnerabilities | Lockfiles, npm audit, pinned base images/ranges | Continuous scanning and update cadence required |

## Secrets and database roles

- `.env.example` contains only explicitly fictional development values. Real secrets belong in a secret manager.
- Production settings reject demo mode, development DB passwords, and short/default JWT secrets.
- Frontend receives no database DSN or migration credentials.
- `tenantcore_app` is non-superuser, non-owner, `NOBYPASSRLS`; migrations use a separate role.
- Restrict PostgreSQL network access and use TLS in production. Rotate JWT/database/API secrets using a documented overlap/revocation process.

## Important trust boundary: custom settings

`app.tenant_id` and `app.is_platform_admin` are PostgreSQL custom settings, not unforgeable tokens. The trusted backend derives them after checking identity/membership. Ordinary application users cannot execute SQL or set them directly.

If an attacker gains arbitrary SQL execution as `tenantcore_app`, they may be able to change those settings. RLS is therefore **not claimed as a complete defense against application-role compromise**. Prevent SQL injection, keep credentials private, monitor behavior, and use separate DB users/schemas/dedicated databases where the threat model requires containment from the application role itself.

Likewise, a PostgreSQL superuser/migration administrator can bypass or change policies. Audit and minimize those credentials. `FORCE RLS` does not make a superuser safe.

## Audit events

Security-sensitive mutations include login/logout, profile/password changes, tenant lifecycle/configuration, membership/role changes, project/team/task/document mutations, comments, API-key create/revoke, and demo seed actions. Events contain tenant (for tenant events), actor, action, resource, request ID, metadata, and UTC timestamp. Metadata records changed field names rather than secret values.

Domain mutation and audit insertion commit atomically. Failed authorization generally has no tenant transaction to attach an event to; security monitoring should use structured request logs or a separate append-only security event pipeline for rejected attempts.

## Rate limits, transport, and frontend

Login uses a Redis fixed-window counter keyed by IP and normalized email. Development may fail open with a warning; production should set `RATE_LIMIT_FAIL_OPEN=false` and use trusted proxy client-IP handling. Add broader API/token bucket limits at a gateway for production.

Use HTTPS, HSTS at the edge, narrow CORS origins, a strict Content Security Policy, and Secure/HttpOnly/SameSite cookies or a BFF for high-assurance browser sessions. The demo's sessionStorage choice avoids persistent disk tokens across browser restarts but remains accessible to same-origin JavaScript and is explicitly not a complete XSS defense.

## Security review before release

1. Run official PostgreSQL adversarial tests as `tenantcore_app`, not only ORM/API tests.
2. Review every new table for RLS/grants/composite FKs and every new route for role/scope checks.
3. Run migration from clean production-like database and test rollback/forward recovery.
4. Verify no secrets/demo credentials are enabled and metrics/docs are not public unintentionally.
5. Exercise suspension, member deactivation, API-key revocation, and session revocation under concurrent requests.
6. Review logs/metrics for data leakage and test backup restoration.
7. Document unresolved risks rather than calling the system universally secure.
