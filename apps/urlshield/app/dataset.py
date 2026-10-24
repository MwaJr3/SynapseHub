"""Synthetic labelled URL dataset generation (deterministic, documented)."""
from __future__ import annotations

import random


def generate(n: int = 400, seed: int = 7) -> tuple[list[str], list[int]]:
    """Deterministic synthetic dataset: structural phishing-like patterns vs
    ordinary-looking URLs. FICTIONAL demo data — not sampled from real traffic."""
    rng = random.Random(seed)
    legit_hosts = ["example.org", "docs.python.org", "github.com", "news.example.net",
                   "shop.example.com", "learn.example.edu", "gov.example.gov", "blog.example.io"]
    bad_hosts = ["secure-login-update.tk", "verify-account-now.ml", "bank-confirm.ga",
                 "free-prize.click", "account-suspended.xyz", "login-verify.top"]
    urls: list[str] = []
    labels: list[int] = []
    for _ in range(n // 2):
        host = rng.choice(legit_hosts)
        if rng.random() < 0.3:
            host = f"www.{host}"
        if rng.random() < 0.2:
            host = f"docs.{host}"
        path = "/" + "/".join(rng.choice(["docs", "products", "blog", "about", "help", "index.html"]) for _ in range(rng.randint(0, 2)))
        scheme = "https" if rng.random() < 0.8 else "http"
        urls.append(f"{scheme}://{host}{path}")
        labels.append(0)
    for _ in range(n // 2):
        host = rng.choice(bad_hosts)
        if rng.random() < 0.5:
            host = f"{rng.choice(['secure', 'verify', 'account', 'login'])}-{rng.randint(1000, 9999)}.{host}"
        if rng.random() < 0.25:
            host = f"{host}@{rng.choice(legit_hosts)}"
        path = "/" + rng.choice(["login", "verify", "update", "confirm", "secure/index.html"])
        if rng.random() < 0.3:
            path += f"?id={rng.randint(100000, 999999)}"
        scheme = "http" if rng.random() < 0.6 else "https"
        urls.append(f"{scheme}://{host}{path}")
        labels.append(1)
    combined = list(zip(urls, labels))
    rng.shuffle(combined)
    return [u for u, _ in combined], [l for _, l in combined]
