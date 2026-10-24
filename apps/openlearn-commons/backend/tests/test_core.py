"""OpenLearn Commons license, attribution, dedupe and translation tests."""
import types

import pytest

from app import core


def test_license_matrix_is_honest():
    by = core.license_guidance("CC BY 4.0")
    assert by.can_adapt and by.can_redistribute and by.can_commercial and not by.uncertain
    nc = core.license_guidance("CC BY-NC 4.0")
    assert nc.can_adapt and not nc.can_commercial
    arr = core.license_guidance("All Rights Reserved")
    assert not arr.can_adapt and not arr.can_redistribute
    unknown = core.license_guidance("Some Custom License")
    assert unknown.license == "Unknown" and unknown.uncertain
    assert not unknown.can_adapt and "no legal certainty" in unknown.obligation
    # publicly accessible ≠ open: 'Unknown' never grants reuse
    assert core.license_guidance("").uncertain


def test_attribution_lines_and_export():
    line = core.attribution_line("Water Cycle", "Ada", "CC BY 4.0", "https://example.invalid/x")
    assert '"Water Cycle"' in line and "by Ada" in line and "CC BY 4.0" in line and "https://example.invalid/x" in line
    unverified = core.attribution_line("Mystery", "", "Weird License 2.0")
    assert "unverified license" in unverified
    export = core.collection_attribution([
        {"title": "A", "creator": "X", "license": "CC BY 4.0"},
        {"title": "B", "creator": "", "license": "Unknown"},
    ])
    assert export.count("\n") == 1 and '"A"' in export and '"B"' in export
    assert core.collection_attribution([]) == "(empty collection)"


def test_duplicate_detection():
    assert core.is_duplicate("Water Cycle!", "", "water cycle", "")
    assert core.is_duplicate("A", "https://x", "Totally Different", "https://x")
    assert not core.is_duplicate("A", "", "B", "")


def test_translation_workflow_and_privacy():
    core.validate_translation_transition("draft", "in_review")
    core.validate_translation_transition("in_review", "approved")
    with pytest.raises(core.WorkflowError):
        core.validate_translation_transition("draft", "approved")  # must pass review
    with pytest.raises(core.WorkflowError):
        core.validate_translation_transition("rejected", "approved")

    approved = types.SimpleNamespace(status="approved")
    draft = types.SimpleNamespace(status="draft")
    assert core.public_translation(approved) is True
    assert core.public_translation(draft) is False  # unpublished translations stay hidden


def test_rating_display_separates_community_and_expert():
    display = core.rating_display(4, "visible", 3.8, expert_reviewed=False)
    assert display["stars"] == 4 and display["community_average"] == 3.8
    assert "neither is an official curriculum alignment" in display["note"]
    hidden = core.rating_display(1, "hidden", 3.8, expert_reviewed=True)
    assert hidden["stars"] is None
