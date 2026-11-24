# Tessera — one image, one origin.
#
# The build has two stages because the frontend is compiled by Node and the API
# runs on Python; shipping the toolchain of both would be most of a gigabyte for
# no reason. The result is a single container that serves the API, the compiled
# frontend and the migrations from the same origin — so the session cookie is
# first-party and CORS never applies in production.
#
# Build context is `companies/`, not the repository root, because the frontend is
# a workspace of `companies/package.json`:
#
#   docker build -f companies/tamuzi/tessera/Dockerfile -t tessera companies/
#
# What the start command insists on, in order:
#
#   1. `alembic upgrade head` — the schema comes from the migrations. The app's
#      own `create_all` is a SQLite convenience and is never the deployment path.
#   2. `python -m app.preflight` — and the container exits if it fails. A
#      deployment that is missing curriculum, pointed at a localhost origin, or
#      serving a production flag over SQLite is not something to announce; better
#      to stop where the log is readable.
#   3. uvicorn, bound to 0.0.0.0 inside the container and trusting the proxy
#      headers of whatever terminates TLS in front of it.
#
# NOT verified: this image has never been built. The environment this was written
# in has no Docker daemon. See docs/DEPLOYMENT.md.

# syntax=docker/dockerfile:1
FROM node:26-alpine AS web
WORKDIR /workspace

# Only the manifests first, so a source change does not re-run npm ci.
COPY package.json package-lock.json ./
COPY tamuzi/tessera/frontend/package.json ./tamuzi/tessera/frontend/
RUN npm ci --no-audit --no-fund

COPY tamuzi/tessera/frontend ./tamuzi/tessera/frontend
# Type-checks, then bundles. `npm run build` is `tsc --noEmit && vite build`, so a
# type error fails the image rather than being discovered at runtime.
RUN npm run build --workspace=tessera-frontend


FROM python:3.15-slim AS app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app
RUN useradd --create-home --uid 10001 tessera && \
    mkdir -p /app/frontend-dist /app/data

COPY tamuzi/tessera/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY tamuzi/tessera/backend/ ./
COPY --from=web /workspace/tamuzi/tessera/frontend/dist/ ./frontend-dist/

RUN chown -R tessera:tessera /app
USER tessera

ENV TESSERA_FRONTEND_DIR=/app/frontend-dist \
    TESSERA_DATA_DIR=/app/data

EXPOSE 8024

# The healthcheck is the same endpoint the compose file and any orchestrator
# poll, so "healthy" means the API answered, not that the process exists.
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
    CMD python -c "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8024/health', timeout=3).status == 200 else 1)"

CMD ["sh", "-c", "python -m alembic upgrade head && python -m app.preflight && exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8024 --proxy-headers --forwarded-allow-ips='*'"]
