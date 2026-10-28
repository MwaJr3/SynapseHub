# Ollama Cloud in the SynapseHub workspace

The server-only cloud provider in `backend/synapsehub/ollama_cloud.py` uses the
**official Ollama Python SDK**, host `https://ollama.com`, model **`gemma4:31b`**,
explicit `Authorization: Bearer` authentication, `stream=False`, a 90-second timeout,
and no redirects, implicit credential fallbacks, retries or alternative providers.

Docs read before implementation:

- https://docs.ollama.com/api/introduction.md
- https://docs.ollama.com/api/authentication.md
- https://docs.ollama.com/llms.txt
- https://docs.ollama.com/capabilities/structured-outputs.md

## Secrets and setup

Use the existing **`backend/.env.local`**, which is ignored by Git. Add a single
`OLLAMA_API_KEY` assignment there; never use a `VITE_*` or `EXPO_PUBLIC_*` variable
for it. The supplied key was appended to that existing file without changing its
previous lines. No key is stored in source, examples, browser code or test fixtures.
Production deployments must configure the same variable in server-only settings;
this local change does not update a hosted deployment or commit any secret.

Install the updated backend dependencies:

```sh
.venv/bin/python -m pip install -r backend/requirements.lock
```

Load secrets using the existing shell convention, then invoke the actual app adapter:

```sh
set -a
. backend/.env.local
set +a
.venv/bin/python backend/scripts/ollama_cloud_smoke.py
```

This sends **one** real chat request and prints only the returned `message.content`
on success. It is not a separate curl test or a mock provider. It does not print
headers, credentials or raw provider error bodies. Errors 401, 402, 404 and 429 have
sanitized, actionable messages and are never automatically retried.

**Live test outcome in this sandbox:** the command was executed, but could not
connect to `ollama.com`. No reply was received. The sandbox's outbound allowlist
does not include that host. Allow outbound HTTPS to `ollama.com` in the execution
environment, or run the command above on a machine with access. Mocked automated
tests are not evidence of successful live inference. There is no example reply here.

## Use from the app

Start the backend after exporting its existing environment file:

```sh
set -a; . backend/.env.local; set +a
PYTHONPATH=backend .venv/bin/uvicorn synapsehub.main:app --host 0.0.0.0 --port 8000
```

In `/synapsehub`, sign in, select PDF sources, and under **Ask selected sources**
choose **Ollama Cloud · gemma4:31b** in **Inference provider**. Review the cloud-data
notice and give fresh consent before **Generate cited answer**.

The authenticated `POST /api/ask` accepts `provider: "cloud"` and calls that same
server-side provider after source-filtered retrieval. The shared TypeScript client
accepts the optional provider argument; no API key is sent by the browser. The
provider dropdown resets inference consent when switching endpoints.

The existing local service remains available and is the default when the provider
is omitted (`OLLAMA_PROVIDER` defaults to `local`). Its `OLLAMA_URL` and
`OLLAMA_MODEL` remain unchanged. For authenticated local/custom inference use
**`OLLAMA_LOCAL_API_KEY`**, not the cloud credential. The cloud key is never sent
to an operator-configured/local endpoint. The local-only `check_runtime.py` probe
uses that separate local credential too.

Ollama Cloud's current docs say it does **not support schema-constrained structured
outputs**. Cloud requests therefore omit `format`; the requested JSON schema is
included in the prompt instead. The server still strictly validates JSON, retrieved
citation IDs and exact supporting quotes. Unsupported JSON/citations fail closed;
there is no second paid request to repair the answer. Local requests retain their
original `format` schema behavior. Citation validation is not proof of entailment.

## Validation

```sh
PYTHONPATH=backend .venv/bin/pytest -q backend/tests
npm run typecheck
npx vitest run src/features/synapsehub/CloudPanel.test.tsx
```

Tests cover the official SDK's host/model/auth/stream serialization, missing-key
rejection before construction, no key forwarding to local inference, sensitive
error redaction, network failures, status-specific no-retry behavior, cloud citation
validation, and explicit provider selection with renewed consent. They use controlled
transports and do not claim a real Ollama reply. Secret files are excluded from commits and pull requests.
