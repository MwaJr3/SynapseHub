"""Phase-B feature tests: presets and property explanations (no logging)."""
from __future__ import annotations

import pytest

from app.features import PROPERTY_EXPLANATIONS, apply_preset, explain_properties


def test_presets_are_explicit():
    web = apply_preset("web")
    assert web["length"] == 16 and web["symbols"] is True
    legacy = apply_preset("legacy")
    assert legacy["symbols"] is False and "Weaker" in legacy["notes"]   # weakness stated
    with pytest.raises(ValueError):
        apply_preset("military-grade")


def test_property_explanations_have_honesty_clauses():
    for key, text in PROPERTY_EXPLANATIONS.items():
        assert "NOT" in text or "not a silver bullet" in text or "does NOT" in text
    items = explain_properties(apply_preset("passphrase"))
    props = [i["property"] for i in items]
    assert "length" in props and "unique_per_service" in props
    assert all(i["explanation"] for i in items)
