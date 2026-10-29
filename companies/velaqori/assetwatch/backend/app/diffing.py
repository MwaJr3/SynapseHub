"""Observation comparison across scan runs.

The interesting output is the DIFF: what is newly observed and what is no
longer observed compared with a previous run — not a static port list.
"""
from __future__ import annotations


def diff_runs(current: list[dict], previous: list[dict]) -> dict:
    """Rows: dicts with target/port/service. Comparison key is (target, port)."""
    cur = {(r["target"], r["port"]): r for r in current}
    prev = {(r["target"], r["port"]): r for r in previous}
    newly = [cur[k] for k in sorted(cur) if k not in prev]
    gone = [prev[k] for k in sorted(prev) if k not in cur]
    changed = [{"target": k[0], "port": k[1], "before": prev[k].get("version", ""),
                "after": cur[k].get("version", "")}
               for k in sorted(cur) if k in prev
               and cur[k].get("version", "") != prev[k].get("version", "")]
    return {"newly_observed": newly, "no_longer_observed": gone, "version_changed": changed,
            "note": ("Differences describe observation changes between two runs — they are "
                     "potential indicators of change, not confirmed attacks.")}
