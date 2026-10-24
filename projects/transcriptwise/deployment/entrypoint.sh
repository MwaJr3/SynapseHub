#!/bin/sh
set -eu
# Exactly one application instance. This process owns the persistent task worker.
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --no-proxy-headers --no-access-log --loop asyncio --http h11
