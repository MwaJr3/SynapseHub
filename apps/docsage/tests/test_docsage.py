"""Tests: TF-IDF ranking, citations + allowlist, visibility, versions, import."""
from __future__ import annotations

from app.index import TfidfIndex, tokenize
from app.store import Store


def test_tokenizer_and_index_ranking():
    idx = TfidfIndex()
    idx.add(1, "python typing strict mypy typing configuration")   # tf(typing)=2
    idx.add(2, "garden soil watering schedule")
    idx.add(3, "python typing dataclasses guide")
    results = idx.search("python typing")
    assert [r[0] for r in results][:2] == [1, 3]        # both python docs rank above garden
    assert results[0][1] > results[1][1]                # 1 has more query-term coverage
    assert idx.search("nonexistent") == []


def test_remove_from_index():
    idx = TfidfIndex()
    idx.add(1, "alpha beta")
    idx.remove(1)
    assert idx.search("alpha") == []


def test_citation_allowlist(tmp_path):
    store = Store(str(tmp_path / "d.db"))
    pid = store.create_page("Architecture", "Service boundaries and data flow decisions.", "ann")
    err = store.add_source(pid, "evil", "https://evil.example.test/x", "configured-url")
    assert "NOT added" in err and "allowlist" in err
    err2 = store.add_source(pid, "python docs", "https://docs.python.org/3/", "configured-url")
    assert err2 == ""
    assert len(store.citations(pid)) == 1


def test_search_visibility_hides_restricted(tmp_path):
    store = Store(str(tmp_path / "d.db"))
    store.create_page("Public runbook", "incident response rotation policy", "ann", visibility="team")
    store.create_page("Salary bands", "incident response compensation bands", "ann", visibility="restricted")
    member = store.search("incident response", "member")
    admin = store.search("incident response", "admin")
    assert len(member) == 1 and member[0]["title"] == "Public runbook"
    assert len(admin) == 2                             # restricted absent from member results entirely


def test_version_diff_and_status(tmp_path):
    store = Store(str(tmp_path / "d.db"))
    pid = store.create_page("T", "body v1 content", "ann")
    store.update_page(pid, "T2", "body v2 content longer", "ann")
    diffs = store.version_diff(pid)
    assert diffs[0]["title_changed"] is True and diffs[0]["body_delta_chars"] == 7
    store.set_status(pid, "published", "rev")
    assert store.conn.execute("SELECT status FROM pages").fetchone()[0] == "published"


def test_import_reports_rejections(tmp_path):
    store = Store(str(tmp_path / "d.db"))
    result = store.import_json({"pages": [{"title": "ok", "body": "content here"},
                                          {"title": "", "body": "missing title"}]})
    assert result["imported"] == 1 and len(result["rejected"]) == 1
    assert "nothing dropped silently" in result["note"]
