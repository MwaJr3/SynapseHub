"""Standalone worker entrypoint:  python -m app.worker   (QUEUE_BACKEND=redis)"""
from .db import init_db
from .jobs import worker_loop

if __name__ == "__main__":
    init_db()
    worker_loop()
