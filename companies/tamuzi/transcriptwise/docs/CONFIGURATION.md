# Configuration and external providers

The application reads the project-root `.env` using Pydantic Settings. Process environment variables override the file. Copy a template, keep it out of Git, restrict its permissions, and restart the API after changing it. Never use a `VITE_` prefix for a credential. No secret is configured through the browser.

## Local/default operation

`AI_PROVIDER=local` needs no external AI service. It selects and organizes real source excerpts, recognizes some explicitly worded definitions/advice/steps, and creates source-connected study templates. It is not an LLM, semantic fact-checker, translator, or reliable technical teacher. It supports English interface/output instructions; excerpts retain their original wording. Explanation level changes study guidance, not inferred explanations. Free-form instructions and non-English output requests are rejected instead of silently pretending to fulfill them.

The example transcript is authored for the application and is always labeled as such. Failed YouTube retrieval never falls back to it automatically.

## OpenAI-compatible language model

Set these server variables:

```dotenv
AI_PROVIDER=openai_compatible
AI_API_KEY=YOUR_SERVER_SIDE_KEY
AI_BASE_URL=https://YOUR_PROVIDER/v1
AI_MODEL=YOUR_CHAT_COMPLETIONS_MODEL
AI_CHUNK_CHARS=18000
AI_MAX_OUTPUT_TOKENS=6500
AI_TIMEOUT_SECONDS=120
```

The endpoint must implement `POST {AI_BASE_URL}/chat/completions`, bearer authentication, `messages`, `response_format: {type: json_object}`, `max_tokens`, and a `choices[0].message.content` JSON string response. A provider with only a Responses API, special reasoning-token parameters, or a different schema needs an adapter change; compatibility is not universal. An administrator can configure a different endpoint, but transcript input cannot change it. Production requires HTTPS.

Each chunk request contains the versioned system prompt, exact output schema, selected preferences, source title, optional target section, and a separate `untrusted_transcript_segments` JSON value. There are no model tools, browsing, private library context, or provider keys in the prompt. A model cannot independently fetch evidence through this application.

Responses are checked with Pydantic and source validation. Unknown segment IDs, missing source references, invalid choices, empty required study output, useless initial guides, and unsupported direct quotations are rejected. Direct quotations must match a cited passage, or ordered adjacent passages, modulo whitespace normalization; their maximum length is 600 characters. At most **one repair request** is made for invalid output. Authorization/rate-limit/connection failures are reported, not fabricated into a guide.

Set chunk size conservatively for the actual model's context window; it is a character bound, not an exact token count. Each request also contains the prompt/schema and needs output space. Model costs may include every chunk, a repair, and a requested section regeneration. Initial retries reuse already valid compatible checkpoints. The application cannot guarantee the semantic truth of a model's explanation.

No live paid/credentialed AI call was available during development verification. Deterministic HTTP tests exercise the adapter contract and failures; perform an end-to-end smoke test with your chosen model before sharing the service.

## Authorized YouTube captions

The independent retrieval adapter uses:

1. Strict parsing of supported watch, short, live, embed, and `youtu.be` URLs into an 11-character ID.
2. Public YouTube oEmbed metadata, where available. It does not supply duration or caption language; those are not invented.
3. Official YouTube Data API v3 `captions.list` and `captions.download`, using the configured account's actual permissions.
4. Manual paste/upload if permission, availability, language, quota or format prevents completion.

A public video is **not** a promise that the official API permits downloading its captions. You normally need appropriate owner/editor or content-management permissions. Enable the YouTube Data API in your Google project and obtain authorized OAuth credentials through Google's supported consent flow and current policies. Caption operations typically require an appropriate YouTube scope such as `https://www.googleapis.com/auth/youtube.force-ssl`; confirm current scope/permission requirements for your account. This project does not include a browser account-connect/consent UI.

Choose one credential mode:

```dotenv
# Short-lived access-token mode:
YOUTUBE_ACCESS_TOKEN=YOUR_AUTHORIZED_ACCESS_TOKEN
```

or:

```dotenv
# Refresh-token mode; leave YOUTUBE_ACCESS_TOKEN empty:
YOUTUBE_CLIENT_ID=YOUR_OAUTH_CLIENT_ID
YOUTUBE_CLIENT_SECRET=YOUR_OAUTH_CLIENT_SECRET
YOUTUBE_REFRESH_TOKEN=YOUR_AUTHORIZED_REFRESH_TOKEN
```

If both modes are filled, the explicit access token takes precedence. Clear/update an expired explicit token; it does not automatically fall through to refresh mode after a rejected download.

**Also set `YOUTUBE_ALLOWED_VIDEO_IDS` to exact comma-separated video IDs** you are permitted to share with this installation's users. No wildcard is accepted. Credentials alone cannot expose the administrator's caption library to arbitrary guest requests. The allowlist is an intentional sharing decision: any workspace user who knows an allowlisted video ID can request an authorized copy. Do not allowlist private material unless sharing it with all users of this installation is appropriate. Separate installations or a future per-user OAuth adapter are needed for per-user Google permissions.

No scraping, browser-cookie extraction, proxy circumvention, DRM bypass, or unauthorized transcript service is included. Failures preserve genuine metadata already obtained and distinguish unavailable captions, authorization, language and transient failures. An authorization error does not claim that public captions do not exist. Live credentialed Google caption retrieval was not verified.

## All server settings

| Variable | Default | Purpose |
|---|---|---|
| `APP_ENV` | `development` | `development`, `test`, or `production` |
| `DATABASE_URL` | `sqlite:///./data/transcriptwise.db` | SQLAlchemy URL; SQLite path is relative to backend cwd |
| `COOKIE_SECURE` | `false` | Must be true with production HTTPS |
| `ALLOWED_HOSTS` | local/test/preview hosts | Comma-separated trusted hosts; no wildcards in production |
| `ALLOWED_ORIGINS` | localhost Vite origins | Exact comma-separated origins; production HTTPS, no path/wildcard |
| `GUEST_RETENTION_DAYS` | `7` | Absolute guest workspace lifetime, 1–30 |
| `UNSAVED_RETENTION_DAYS` | `30` | Unsaved guide/old-task retention, 1–365 |
| `SESSION_DAYS` | `14` | Account session lifetime, 1–90 |
| `MAX_UPLOAD_BYTES` | `2000000` | UTF-8 upload/caption byte limit, maximum 10 MB |
| `MAX_TRANSCRIPT_CHARS` | `300000` | Full accepted source limit, maximum 2 million |
| `MIN_TRANSCRIPT_CHARS` | `80` | Minimum useful input; the default UI minimum is 80 |
| `DAILY_ANALYSIS_LIMIT` | `30` | Rolling 24-hour analysis/regeneration/retry quota per owner |
| `REQUESTS_PER_MINUTE` | `120` | In-process per-peer API limit |
| `EXPENSIVE_REQUESTS_PER_HOUR` | `30` | In-process per-peer expensive-route limit |
| `AI_PROVIDER` | `local` | `local` or `openai_compatible` |
| `AI_API_KEY` | empty | Server-only bearer credential |
| `AI_BASE_URL` | `https://api.openai.com/v1` | Compatible API base URL |
| `AI_MODEL` | empty | Required for compatible AI mode |
| `AI_CHUNK_CHARS` | `18000` | Chunk character bound, 2,000–100,000 |
| `AI_MAX_OUTPUT_TOKENS` | `6500` | Per-call requested output budget, 1,000–30,000 |
| `AI_TIMEOUT_SECONDS` | `120` | Per-call timeout, 10–600 seconds |
| `YOUTUBE_ALLOWED_VIDEO_IDS` | empty | Exact administrator caption-sharing allowlist |
| `YOUTUBE_ACCESS_TOKEN` | empty | Explicit authorized Google access token |
| `YOUTUBE_CLIENT_ID` | empty | Refresh mode client ID |
| `YOUTUBE_CLIENT_SECRET` | empty | Refresh mode client secret |
| `YOUTUBE_REFRESH_TOKEN` | empty | Refresh mode refresh token |
| `WORKER_ENABLED` | `true` | Persistent in-process worker; keep on for normal operation |
| `SERVE_FRONTEND` | `false` | Serve built SPA from the API process |
| `FRONTEND_PATH` | `frontend/dist` under root | Optional absolute/relative built-asset location |

`POSTGRES_PASSWORD`, `APP_BIND`, and `APP_PORT` belong to Compose. Generate a URL-safe PostgreSQL password because the provided Compose URL interpolates it directly; reserved URL characters require a custom properly encoded database URL. `VITE_API_TARGET` belongs only to the development proxy, not the browser bundle. Do not expose the development server publicly as a production service.

Authentication also has a fixed limit of **20 attempts per 600 seconds (10 minutes) per peer**, shared across the protected authentication routes; it is not an environment setting. Limits are in-process and use the actual ASGI peer address, not arbitrary forwarded headers. Behind an untrusted/unconfigured proxy, users can share that peer budget; configure trusted ingress deliberately and apply edge limits before public use.
