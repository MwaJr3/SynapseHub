# API usage and routes

Base path: `/api/v1`. Requests are same-origin JSON except multipart upload and exports. Development Swagger: `/docs`; machine-readable OpenAPI: `/openapi.json`. Production interactive docs are intentionally disabled. The generated OpenAPI is the source of exact schemas; request models reject extra fields.

1. `GET /session` creates or returns the current guest/account session. Store its cookie in your client and the returned `csrf_token` in memory.
2. Send `X-CSRF-Token` and the same session cookie on every mutating private request. Browser code uses `credentials: same-origin`; do not copy the HttpOnly cookie into localStorage.
3. Create a source, review/edit it with its version, then create an analysis. Poll its actual task; do not assume a 202 response is a completed guide.
4. Fetch the owned analysis and source for display. Use current revision on patches/regeneration; handle 409 without overwriting a newer edit.

| Method and path | Behavior |
|---|---|
| `GET /health` | Database/worker status and configured provider category, no secret |
| `GET /session` | Cookie-backed identity, CSRF token, public capabilities |
| `POST /auth/register` | Convert guest to account, hash password, revoke old guest sessions, issue new session |
| `POST /auth/login` | Authenticate, adopt current guest records, rotate session |
| `POST /auth/logout` | Revoke current session |
| `PATCH /preferences` | Merge supplied validated preference fields without resetting unrelated defaults |
| `DELETE /account` | Delete current workspace/account; account requires current password |
| `POST /transcripts/text` | Create a source from real pasted text |
| `POST /transcripts/upload` | Multipart `file` with UTF-8 TXT/SRT/VTT |
| `GET /transcripts/{id}` | Owned original/reviewed text, metadata, segments and version |
| `PATCH /transcripts/{id}` | Version-guarded review; blocked after analysis locks source |
| `POST /transcripts/{id}/duplicate` | Create independent editable copy from current source |
| `POST /youtube/validate` | Validate/canonicalize supported URL, no invented metadata |
| `POST /youtube/retrieve` | Queue actual authorized retrieval attempt |
| `POST /analyses` | Queue source analysis using chosen configuration |
| `GET /analyses` | Owned paginated search/saved/folder/tag/source/sort library |
| `GET /analyses/{id}` | Current guide/status/coverage/notes/latest task |
| `PATCH /analyses/{id}` | Revision-guarded title, notes, save state, organization or one section |
| `DELETE /analyses/{id}` | Delete guide/study activity and source if unused |
| `POST /analyses/{id}/regenerate` | Queue validated replacement of selected section/quiz/cards |
| `GET /tasks/{id}` | Owned actual progress/result/error |
| `POST /tasks/{id}/retry` | Retry failed/interrupted compatible task; new task row |
| `POST /analyses/{id}/quiz/attempts` | Validate every current answer and grade objective questions only |
| `GET /analyses/{id}/quiz/attempts` | Recent owned attempt history |
| `GET /flashcards` | Owned cards, due state, pagination and optional guide filter |
| `POST /analyses/{id}/flashcards/review` | Record rating and actual next due date |
| `GET /analyses/{id}/export?format=markdown\|docx\|html\|json` | Private portable export/print document |
| `GET /stats` | Real owner activity/counts; no fake mastery score |

IDs must come from prior responses; they are not authorization. An unrelated record returns 404. Mutations use `version` or `revision` as applicable. Quotas apply to analysis/regeneration/retries; retrieval has its own expensive-route limit. Public timestamps end in `Z` (UTC).

Errors use `{ "error": { "code": "...", "message": "...", "fields": [...] } }` where applicable. Common status codes: 401 expired session, 403 CSRF/account requirement/origin, 404 not in this workspace, 409 concurrent edit/not-ready, 413 request size, 422 invalid input/provider/retrieval issue, and 429 rate/quota. Queued task failures appear in owned task state with a clear code/message; they are not silently replaced by samples.

JSON export format `1.0` includes current guide/configuration/notes, original and reviewed source/segments, attempts, reviews, and unabridged **initial** validated chunk results. The initial chunks are not a full archive of later user edits/regenerations. Exports never include other users' records, session tokens/password hashes or provider credentials.
