#!/usr/bin/env python3
"""Zero-dependency static server for the Mwangala portfolio + 7 demo apps.

Serves the portfolio at / with clean URLs:
  /projects/sentinelcore/  -> projects/sentinelcore/index.html
  /apps/sentinelcore/      -> apps/sentinelcore/index.html

Adds sensible security headers. Stdlib only.
"""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = 8000


class Handler(SimpleHTTPRequestHandler):
    server_version = "MwangalaServer/1.0"

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' data:; "
            "style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; "
            "connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
        )
        super().end_headers()

    def log_message(self, *args):
        pass  # quiet


if __name__ == "__main__":
    import os

    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with ThreadingHTTPServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"Mwangala portfolio → http://localhost:{PORT}/")
        print("Press Ctrl+C to stop.")
        httpd.serve_forever()
