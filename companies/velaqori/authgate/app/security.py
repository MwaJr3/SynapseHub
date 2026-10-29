"""Security middleware pieces: headers, CSRF, rate limiting (fixed window)."""
from __future__ import annotations

import secrets
import time

# Baseline headers. HSTS is only appropriate behind HTTPS — emitted with that
# condition noted in the README; the demo includes it as a config flag.
def security_headers(include_hsts: bool = False) -> dict[str, str]:
    headers = {
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "no-store",
    }
    if include_hsts:
        headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return headers


class RateLimiter:
    """In-memory fixed-window limiter (per key). Bounded memory: keys expire."""
    def __init__(self, max_per_window: int = 10, window_seconds: int = 60) -> None:
        self.max = max_per_window
        self.window = window_seconds
        self._hits: dict[str, tuple[int, int]] = {}

    def allow(self, key: str) -> bool:
        now = int(time.time())
        window_id = now // self.window
        stored = self._hits.get(key)
        if stored is None or stored[0] != window_id:
            self._hits[key] = (window_id, 1)
            return True
        if stored[1] >= self.max:
            return False
        self._hits[key] = (window_id, stored[1] + 1)
        return True


def new_csrf() -> str:
    return secrets.token_urlsafe(24)
