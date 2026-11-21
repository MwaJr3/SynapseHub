FROM node:26-bookworm-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.13-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app/backend
COPY backend/requirements.lock /tmp/requirements.lock
RUN pip install --no-cache-dir --require-hashes -r /tmp/requirements.lock \
    && groupadd --gid 10001 transcriptwise \
    && useradd --uid 10001 --gid 10001 --create-home --home-dir /home/transcriptwise transcriptwise \
    && mkdir -p /app/backend/data && chown -R 10001:10001 /app
COPY --chown=10001:10001 backend/app ./app
COPY --chown=10001:10001 backend/alembic ./alembic
COPY --chown=10001:10001 backend/alembic.ini ./alembic.ini
COPY --from=frontend --chown=10001:10001 /frontend/dist /app/frontend/dist
COPY deployment/entrypoint.sh /usr/local/bin/transcriptwise
RUN chmod 755 /usr/local/bin/transcriptwise
USER 10001:10001
ENV SERVE_FRONTEND=true
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/health', timeout=4)" || exit 1
ENTRYPOINT ["/usr/local/bin/transcriptwise"]
