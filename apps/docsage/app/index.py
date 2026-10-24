"""Offline search: TF-IDF ranking over tokenized documents (stdlib only).

DSA note: build cost O(total_tokens), query cost O(vocab) for the sparse
score accumulation — suitable for bounded internal corpora.
"""
from __future__ import annotations

import math
import re
from collections import Counter, defaultdict

TOKEN = re.compile(r"[a-z0-9]{2,}")

STOP = {"the", "and", "for", "with", "that", "this", "are", "was", "how", "what"}


def tokenize(text: str) -> list[str]:
    return [t for t in TOKEN.findall(text.lower()) if t not in STOP]


class TfidfIndex:
    def __init__(self) -> None:
        self.docs: dict[int, list[str]] = {}
        self.df: Counter[str] = Counter()
        self._built = False

    def add(self, doc_id: int, text: str) -> None:
        tokens = tokenize(text)
        self.docs[doc_id] = tokens
        self.df.update(set(tokens))
        self._built = False

    def remove(self, doc_id: int) -> None:
        if doc_id in self.docs:
            self.df.subtract(set(self.docs[doc_id]))
            del self.docs[doc_id]
            self._built = False

    def search(self, query: str, limit: int = 10) -> list[tuple[int, float]]:
        if not self.docs:
            return []
        n = len(self.docs)
        scores: dict[int, float] = defaultdict(float)
        q_tokens = tokenize(query)
        for term in q_tokens:
            df = self.df.get(term, 0)
            if df == 0:
                continue
            idf = math.log((1 + n) / (1 + df)) + 1.0
            for doc_id, tokens in self.docs.items():
                tf = tokens.count(term)
                if tf:
                    scores[doc_id] += (1 + math.log(tf)) * idf
        ranked = sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))
        return [(doc_id, round(score, 4)) for doc_id, score in ranked[:limit]]
