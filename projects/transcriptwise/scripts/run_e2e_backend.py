"""Isolated real API/worker for Playwright. NEVER uses the developer's database."""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
backend = ROOT / "backend"
scratch = ROOT / ".e2e"
scratch.mkdir(exist_ok=True)
for filename in ("browser-tests.db", "browser-tests.db-wal", "browser-tests.db-shm"):
    (scratch / filename).unlink(missing_ok=True)
os.environ.update(
    {
        "APP_ENV": "test",
        "DATABASE_URL": "sqlite:///" + str(scratch / "browser-tests.db"),
        "AI_PROVIDER": "local",
        "WORKER_ENABLED": "true",
        "COOKIE_SECURE": "false",
        "REQUESTS_PER_MINUTE": "10000",
        "EXPENSIVE_REQUESTS_PER_HOUR": "10000",
        "DAILY_ANALYSIS_LIMIT": "1000",
        "ALLOWED_HOSTS": "localhost,127.0.0.1",
        "ALLOWED_ORIGINS": "http://127.0.0.1:5311,http://localhost:5311",
        "YOUTUBE_ACCESS_TOKEN": "",
        "YOUTUBE_REFRESH_TOKEN": "",
        "YOUTUBE_ALLOWED_VIDEO_IDS": "",
        "SERVE_FRONTEND": "false",
    }
)
os.chdir(backend)
sys.path.insert(0, str(backend))
from alembic import command
from alembic.config import Config

command.upgrade(Config(str(backend / "alembic.ini")), "head")
os.execv(
    sys.executable,
    [
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        "8001",
        "--no-access-log",
        "--no-proxy-headers",
        "--loop",
        "asyncio",
        "--http",
        "h11",
    ],
)
