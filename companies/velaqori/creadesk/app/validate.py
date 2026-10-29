"""Pre-publish validation checks with explicit messages."""
from __future__ import annotations

import re


def check_content(title: str, body: str, scheduled_at: str = "") -> list[str]:
    problems = []
    if not title.strip():
        problems.append("title is empty")
    if len(body.strip()) < 40:
        problems.append("body must be at least 40 characters (currently {})".format(len(body.strip())))
    if re.search(r"lorem ipsum", body, re.I):
        problems.append("body contains placeholder text (lorem ipsum)")
    # External links policy: configurable allowlist only; flag anything else
    # for review rather than silently publishing.
    for m in re.finditer(r"https?://[^\s)\"]+", body):
        url = m.group(0)
        if not url.startswith(("https://github.com/", "https://docs.python.org/")):
            problems.append(f"external link not on the configured allowlist: {url}")
    if scheduled_at and not re.match(r"\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?", scheduled_at):
        problems.append("scheduled_at must look like YYYY-MM-DD or YYYY-MM-DDTHH:MM")
    return problems
