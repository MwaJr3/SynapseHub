"""Modern features: column profiling, recipes (replayable transform log),
reversible transforms, bounded preview.

DSA notes: profiling is one pass per column O(n); preview is O(rows);
transforms record originals so undo is O(1) per column.
"""
from __future__ import annotations


class FeatureError(ValueError):
    pass


def profile_column(values: list) -> dict:
    n = len(values)
    if n == 0:
        raise FeatureError("cannot profile an empty column")
    missing = sum(1 for v in values if v is None or v == "")
    non_null = [v for v in values if v is not None and v != ""]
    distinct = len(set(map(str, non_null)))
    numeric = []
    for v in non_null:
        try:
            numeric.append(float(v))
        except (TypeError, ValueError):
            pass
    out = {"count": n, "missing": missing, "missing_pct": round(100 * missing / n, 2),
           "distinct": distinct, "numeric_count": len(numeric)}
    if numeric and len(numeric) == len(non_null):
        out["min"], out["max"] = min(numeric), max(numeric)
        out["mean"] = round(sum(numeric) / len(numeric), 4)
    else:
        out["type_guess"] = "mixed/text"
    return out


class Recipe:
    """A recipe records each transform so it can be replayed and undone."""

    def __init__(self) -> None:
        self.steps: list[dict] = []
        self._originals: dict[str, list] = {}

    def trim(self, column: str, values: list[str]) -> list[str]:
        self._originals.setdefault(column, list(values))
        self.steps.append({"op": "trim", "column": column})
        return [v.strip() if isinstance(v, str) else v for v in values]

    def fill_missing(self, column: str, values: list, fill: str = "") -> list:
        self._originals.setdefault(column, list(values))
        self.steps.append({"op": "fill_missing", "column": column, "fill": fill})
        return [fill if (v is None or v == "") else v for v in values]

    def undo(self, column: str) -> list:
        if column not in self._originals:
            raise FeatureError(f"no recorded original for {column!r}")
        return self._originals[column]

    def replay_plan(self) -> list[dict]:
        return list(self.steps)


def bounded_preview(rows: list[dict], limit: int = 10) -> list[dict]:
    if limit < 1 or limit > 100:
        raise FeatureError("preview limit must be within 1..100 (bounded preview)")
    return rows[:limit]
