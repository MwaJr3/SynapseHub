"""Phase-B feature tests: profiling, recipes, reversible transforms, preview."""
from __future__ import annotations

import pytest

from app.features import FeatureError, Recipe, bounded_preview, profile_column


def test_profiling_reports_missing_and_types():
    stats = profile_column(["1", "3", None, "5", ""])
    assert stats["missing"] == 2 and stats["missing_pct"] == 40.0
    assert stats["min"] == 1.0 and stats["max"] == 5.0 and stats["mean"] == 3.0
    mixed = profile_column(["a", "1", "b"])
    assert mixed["type_guess"] == "mixed/text" and "mean" not in mixed
    with pytest.raises(FeatureError):
        profile_column([])


def test_recipe_transforms_are_reversible():
    recipe = Recipe()
    values = ["  a  ", "", "b"]
    trimmed = recipe.trim("col", values)
    assert trimmed == ["a", "", "b"]
    filled = recipe.fill_missing("col", trimmed, fill="N/A")
    assert filled == ["a", "N/A", "b"]
    assert recipe.replay_plan() == [{"op": "trim", "column": "col"},
                                    {"op": "fill_missing", "column": "col", "fill": "N/A"}]
    assert recipe.undo("col") == values               # original restored
    with pytest.raises(FeatureError):
        recipe.undo("nope")


def test_bounded_preview():
    rows = [{"i": i} for i in range(50)]
    assert len(bounded_preview(rows, 5)) == 5
    with pytest.raises(FeatureError):
        bounded_preview(rows, 1000)
