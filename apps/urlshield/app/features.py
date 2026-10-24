"""Explainable URL feature extraction — independent of any model (testable).

Features are structural properties of the URL string ONLY. The tool never
visits URLs; extraction is entirely offline.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass
from urllib.parse import urlparse

FEATURE_NAMES = ("url_length", "host_length", "num_dots", "num_hyphens", "num_digits",
                 "has_ip_host", "has_at_sign", "has_https", "num_subdomains",
                 "path_length", "has_suspicious_tld", "digit_letter_ratio")

SUSPICIOUS_TLDS = {"tk", "ml", "ga", "cf", "gq", "xyz", "top", "click", "zip", "mov"}


@dataclass(frozen=True)
class UrlFeatures:
    values: tuple[float, ...]

    def as_dict(self) -> dict:
        return dict(zip(FEATURE_NAMES, self.values))


def extract(url: str) -> UrlFeatures:
    raw = url.strip()
    if not raw:
        raise ValueError("Empty URL has no features.")
    parsed = urlparse(raw if "://" in raw else "http://" + raw)
    host = parsed.hostname or ""
    path = parsed.path or ""
    labels = host.split(".") if host else []
    is_ip = bool(re.fullmatch(r"\d{1,3}(\.\d{1,3}){3}", host))
    letters = sum(c.isalpha() for c in raw)
    digits = sum(c.isdigit() for c in raw)
    ratio = digits / max(1, letters + digits)
    values = (
        float(len(raw)), float(len(host)), float(raw.count(".")), float(raw.count("-")),
        float(digits), 1.0 if is_ip else 0.0, 1.0 if "@" in raw else 0.0,
        1.0 if raw.lower().startswith("https") else 0.0,
        float(max(0, len(labels) - 2)), float(len(path)),
        1.0 if labels and labels[-1].lower() in SUSPICIOUS_TLDS else 0.0,
        round(ratio, 4),
    )
    return UrlFeatures(values)
