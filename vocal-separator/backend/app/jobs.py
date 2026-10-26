"""Job dispatch (§47/51/118). Default: bounded in-process thread queue so the
product runs with zero infrastructure. Production: set QUEUE_BACKEND=redis and
run `python -m app.worker` on GPU nodes — the API only enqueues job ids.
Long-running inference never happens inside an HTTP request."""
from __future__ import annotations
import threading
from concurrent.futures import ThreadPoolExecutor
from .config import QUEUE_BACKEND, REDIS_URL, WORKER_THREADS
from .pipeline import run_job

_pool = ThreadPoolExecutor(max_workers=max(1, WORKER_THREADS), thread_name_prefix="sep-worker")


def enqueue(job_id: int, priority: str = "normal") -> str:
    if QUEUE_BACKEND == "redis":
        try:
            import redis
            r = redis.from_url(REDIS_URL)
            r.lpush(f"queue:{priority}", str(job_id))
            return "redis"
        except Exception:
            pass  # fall through to inline rather than losing the job; surfaced in /health
    _pool.submit(_run_safe, job_id)
    return "inline"


def _run_safe(job_id: int):
    try:
        run_job(job_id)
    except Exception:
        pass  # failure already recorded on the job row by the pipeline (§50)


def worker_loop():  # CLI entry: python -m app.worker
    import redis, time
    r = redis.from_url(REDIS_URL)
    while True:
        item = r.brpop(["queue:priority", "queue:normal", "queue:low"], timeout=5)
        if not item:
            continue
        _run_safe(int(item[1]))
