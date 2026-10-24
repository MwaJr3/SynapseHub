"""Modern features: recurring tasks, dependency cycle detection, saved filters,
focus view.

DSA notes: cycle detection is DFS O(V+E) over the dependency edges; focus
view sorts O(n log n); recurrence expansion is O(occurrences) with a bound.
"""
from __future__ import annotations

from datetime import date, timedelta


class FeatureError(ValueError):
    pass


INTERVALS = {"daily": 1, "weekly": 7, "monthly": 30}


def next_occurrence(base: str, interval: str, occurrences: int = 3) -> list[str]:
    if interval not in INTERVALS:
        raise FeatureError(f"interval must be one of {sorted(INTERVALS)}")
    if not 1 <= occurrences <= 30:
        raise FeatureError("occurrences must be within 1..30 (bounded expansion)")
    start = date.fromisoformat(base)
    step = INTERVALS[interval]
    return [(start + timedelta(days=step * i)).isoformat() for i in range(1, occurrences + 1)]


def detect_cycle(edges: list[tuple[int, int]]) -> list[int] | None:
    """Return the cycle path if task dependencies form a cycle, else None."""
    graph: dict[int, list[int]] = {}
    for a, b in edges:
        graph.setdefault(a, []).append(b)
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {n: WHITE for n in graph}
    stack: list[int] = []

    def dfs(node: int) -> list[int] | None:
        color[node] = GRAY
        stack.append(node)
        for nxt in graph.get(node, []):
            if color.get(nxt, WHITE) == GRAY:
                return stack[stack.index(nxt):] + [nxt]
            if color.get(nxt, WHITE) == WHITE:
                found = dfs(nxt)
                if found:
                    return found
        stack.pop()
        color[node] = BLACK
        return None

    for node in list(graph):
        if color[node] == WHITE:
            found = dfs(node)
            if found:
                return found
    return None


PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}


def focus_view(tasks: list[dict], limit: int = 5) -> list[dict]:
    """Top tasks by (priority, due date). O(n log n)."""
    if limit < 1:
        raise FeatureError("limit must be positive")
    ranked = sorted(tasks, key=lambda t: (PRIORITY_ORDER.get(t.get("priority", "medium"), 1),
                                          t.get("due", "9999-12-31"), t.get("id", 0)))
    return ranked[:limit]


def save_filter(name: str, criteria: dict, registry: dict[str, dict]) -> dict:
    if not name.strip():
        raise FeatureError("filter name must be non-empty")
    registry[name] = dict(criteria)
    return registry
