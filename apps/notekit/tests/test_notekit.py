"""Tests: versioned edits, separation of sources, search ranking, links."""
from __future__ import annotations

import pytest

from app.services import NoteError, Notes


@pytest.fixture()
def notes(tmp_path):
    return Notes(str(tmp_path / "n.db"))


def test_add_and_search_ranking(notes):
    notes.add_note("Photosynthesis", "plants convert light to energy", "biology")
    notes.add_note("Energy essay", "photosynthesis is fascinating", "biology")
    results = notes.search("photosynthesis")
    assert results[0]["title"] == "Photosynthesis"       # title match ranks first
    assert len(results) == 2


def test_edit_saves_previous_version(notes):
    nid = notes.add_note("Draft", "first text")
    notes.edit_note(nid, body="second text")
    notes.edit_note(nid, body="third text")
    versions = notes.versions(nid)
    assert len(versions) == 2
    assert versions[0]["title"] == "Draft"
    with pytest.raises(NoteError):
        notes.edit_note(999, body="x")
    with pytest.raises(NoteError):
        notes.edit_note(nid, title="  ")


def test_tags_and_links(notes):
    a = notes.add_note("A", "aaa"); b = notes.add_note("B", "bbb")
    notes.add_tag(a, "Maths"); notes.add_tag(a, "maths")     # idempotent
    notes.link(a, b, "supports")
    assert [r["id"] for r in notes.related(b)] == [a]
    with pytest.raises(NoteError):
        notes.link(a, a)
    with pytest.raises(NoteError):
        notes.link(a, 999)


def test_sources_are_distinct_from_notes(notes):
    nid = notes.add_note("Review", "content")
    sid = notes.add_source(nid, "Clean Code", kind="book", ref="ISBN demo")
    assert sid == 1
    with pytest.raises(NoteError):
        notes.add_source(None, "  ")
    with pytest.raises(NoteError):
        notes.add_source(999, "x")


def test_lessons(notes):
    nid = notes.add_note("X", "y")
    notes.add_lesson(nid, "review drills improve recall")
    with pytest.raises(NoteError):
        notes.add_lesson(999, "x")
    with pytest.raises(NoteError):
        notes.add_lesson(nid, "  ")


def test_validation(notes):
    with pytest.raises(NoteError):
        notes.add_note("", "body")
    with pytest.raises(NoteError):
        notes.add_note("t", "")
    with pytest.raises(NoteError):
        notes.add_tag(999, "x")
