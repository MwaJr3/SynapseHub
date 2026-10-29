"""Manifest validation tests (requirements.txt and pyproject.toml)."""
from app import manifests

from conftest import upload_manifest


def test_parse_requirements_basic():
    text = "# comment\nrequests==2.19.0\nurllib3 >= 1.26, < 2\nflask\n-r other.txt\nnot a requirement!!\n"
    result = manifests.parse_requirements(text)
    names = {p.name: p.version_spec for p in result.packages}
    assert names["requests"] == "==2.19.0"
    assert names["urllib3"] == ">= 1.26, < 2"
    assert names["flask"] == ""
    assert any("option line" in e["reason"] for e in result.errors)
    assert any("unrecognised" in e["reason"] for e in result.errors)


def test_parse_pyproject_dependencies():
    text = (
        '[project]\nname = "x"\ndependencies = [\n  "requests==2.19.0",\n  "pydantic>=2",\n]\n'
    )
    result = manifests.parse_pyproject(text)
    assert [p.name for p in result.packages] == ["requests", "pydantic"]
    assert result.errors == []


def test_parse_pyproject_invalid_toml():
    result = manifests.parse_pyproject("[project\nbroken")
    assert result.packages == []
    assert "invalid TOML" in result.errors[0]["reason"]


def test_parse_pyproject_without_dependencies():
    result = manifests.parse_pyproject('[project]\nname = "x"\n')
    assert result.packages == []
    assert result.errors


def test_upload_rejects_unsupported_and_empty(authed_client, project):
    bad = authed_client.post(f"/api/projects/{project}/manifests", files={"file": ("setup.exe", b"x", "application/octet-stream")})
    assert bad.status_code == 400
    empty = authed_client.post(f"/api/projects/{project}/manifests", files={"file": ("requirements.txt", b"# only comments\n", "text/plain")})
    assert empty.status_code == 400


def test_manifest_history_and_select(authed_client, project):
    m1 = upload_manifest(authed_client, project, "requirements.txt", b"requests==2.19.0\n")
    m2 = upload_manifest(authed_client, project, "requirements.txt", b"flask==1.0\n")
    authed_client.post(f"/api/manifests/{m2}/select")
    listing = authed_client.get(f"/api/projects/{project}/manifests").json()
    assert len(listing) == 2
    selected = [m for m in listing if m["selected"]]
    assert len(selected) == 1 and selected[0]["id"] == m2
