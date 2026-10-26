"""Phase-B feature tests: backlinks, bounded graph, duplicates, markdown IO."""
from __future__ import annotations

import pytest

from app.features import (FeatureError, backlinks, detect_duplicates, export_markdown,
                          graph_bounded, import_markdown)


def test_backlinks():
    links = [(1, 2), (3, 2), (2, 4)]
    assert backlinks(2, links) == [1, 3]
    assert backlinks(1, links) == []


def test_graph_bounded_expansion():
    links = [(1, 2), (1, 3), (2, 4), (3, 5), (4, 6)]
    g = graph_bounded(1, links, depth=2, max_nodes=50)
    assert g["levels"][0] == [1] and set(g["levels"][1]) == {2, 3}
    assert g["truncated"] is False
    tiny = graph_bounded(1, links, depth=4, max_nodes=3)
    assert tiny["truncated"] is True and tiny["nodes_visited"] <= 3
    with pytest.raises(FeatureError):
        graph_bounded(1, links, depth=9)


def test_duplicate_detection_flags_for_review():
    notes = [{"id": 1, "body": "alpha beta gamma delta epsilon"},
             {"id": 2, "body": "alpha beta gamma delta epsilon"},
             {"id": 3, "body": "completely different content here"}]
    dupes = detect_duplicates(notes, threshold=0.8)
    assert len(dupes) == 1 and dupes[0]["id_a"] == 1 and dupes[0]["id_b"] == 2
    assert "never auto-merged" in dupes[0]["action"]
    with pytest.raises(FeatureError):
        detect_duplicates(notes, threshold=0.2)


def test_markdown_round_trip():
    notes = [{"title": "A", "body": "first body"}, {"title": "B", "body": "second body"}]
    text = export_markdown(notes)
    result = import_markdown(text)
    assert [n["title"] for n in result["notes"]] == ["A", "B"]
    bad = import_markdown("# only-heading\n")
    assert bad["rejected"] and "heading without body" in bad["rejected"][0]["reason"]
    empty = import_markdown("# titled but empty\n   \n")
    assert empty["rejected"] and "empty body" in empty["rejected"][0]["reason"]
