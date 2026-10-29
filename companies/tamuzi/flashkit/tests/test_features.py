"""Phase-B feature tests: cloze parsing, tags, difficult-cards selection."""
from __future__ import annotations

import pytest

from app.features import add_tags, difficult_session, filter_by_tag, parse_cloze, FeatureError


def test_cloze_parse():
    card = parse_cloze("The {{mitochondria}} is the {{powerhouse}} of the cell")
    assert card["prompt"] == "The [...] is the [...] of the cell"
    assert card["answers"] == ["mitochondria", "powerhouse"]
    with pytest.raises(FeatureError):
        parse_cloze("no blanks here")


def test_tags_dedupe_and_filter():
    card = add_tags({"id": 1}, ["biology", " hard "])
    card = add_tags(card, ["biology"])                 # duplicate collapses
    assert card["tags"] == ["biology", "hard"]
    cards = [card, {"id": 2, "tags": ["math"]}]
    assert filter_by_tag(cards, "biology") == [card]
    with pytest.raises(FeatureError):
        add_tags({"id": 3}, ["  "])


def test_difficult_session_lowest_success_first():
    cards = [{"id": 1, "reviews": 10, "correct": 9},
             {"id": 2, "reviews": 10, "correct": 2},
             {"id": 3, "reviews": 4, "correct": 1},
             {"id": 4, "reviews": 0, "correct": 0}]
    session = difficult_session(cards, limit=3)
    assert [c["id"] for c in session] == [4, 2, 3]     # unseen (0.0) first, then 0.2, then 0.25
    with pytest.raises(FeatureError):
        difficult_session(cards, limit=0)
