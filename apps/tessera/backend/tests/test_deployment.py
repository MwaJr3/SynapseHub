"""Deployment artefacts that have to be true, not just present.

Stage 6 adds a production build: one container serving the API and the compiled
frontend from the same origin. These tests check the parts of that claim which
can be checked without Docker:

* the static mount serves the app, and cannot be used to read a file outside it;
* an API path that does not exist is still a JSON 404, not the HTML shell;
* the document carries a Content-Security-Policy and is not cached;
* the container definition actually runs the migrations and the preflight, and
  names the same variables the code reads;
* every environment variable the backend reads is documented in `.env.example`.

What they cannot check is written in `docs/DEPLOYMENT.md`: no Docker daemon and
no browser exist in the environment this was written in.
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.headers import security_headers
from app.static_site import RESERVED_PREFIXES, mount_frontend

BACKEND_ROOT = Path(__file__).resolve().parents[1]
TESSERA_ROOT = BACKEND_ROOT.parent
FRONTEND = TESSERA_ROOT / "frontend"


@pytest.fixture()
def site(tmp_path: Path) -> Path:
    """A stand-in for `npm run build` output."""
    root = tmp_path / "dist"
    (root / "assets").mkdir(parents=True)
    (root / "index.html").write_text("<!doctype html><title>Tessera</title>", encoding="utf-8")
    (root / "assets" / "index-abc123.js").write_text("console.log('tessera');", encoding="utf-8")
    (root / "hero-tessera.png").write_bytes(b"\x89PNG\r\n\x1a\n")
    (tmp_path / "outside-secret.txt").write_text("do not serve me", encoding="utf-8")
    return root


@pytest.fixture()
def spa(site: Path) -> TestClient:
    app = FastAPI()
    mount_frontend(app, site)
    with TestClient(app) as client:
        yield client


def test_a_deep_link_is_the_app_not_a_404(spa: TestClient):
    """A learner who reloads on a route must get the app, not a missing page."""
    response = spa.get("/some/deep/link")
    assert response.status_code == 200
    assert "<title>Tessera</title>" in response.text


def test_the_document_is_not_cached_but_the_hashed_assets_are(spa: TestClient):
    document = spa.get("/")
    assert document.headers["cache-control"] == "no-cache"
    script = spa.get("/assets/index-abc123.js")
    assert script.status_code == 200
    assert "console.log" in script.text


def test_a_top_level_file_beside_the_document_is_served(spa: TestClient):
    image = spa.get("/hero-tessera.png")
    assert image.status_code == 200
    assert image.content.startswith(b"\x89PNG")


def test_an_unknown_api_path_stays_a_json_404(spa: TestClient):
    """The fallback must not answer an API client with an HTML document."""
    response = spa.get("/api/does-not-exist")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/json")


@pytest.mark.parametrize("path", ["/../outside-secret.txt", "/assets/../../outside-secret.txt"])
def test_a_path_outside_the_build_directory_is_not_served(spa: TestClient, path: str):
    response = spa.get(path)
    # Either the document (the resolved path fell back) or a 404 — never the file.
    assert "do not serve me" not in response.text


def test_mounting_refuses_a_directory_without_a_document(tmp_path: Path):
    with pytest.raises(RuntimeError, match="index.html"):
        mount_frontend(FastAPI(), tmp_path)


def test_the_api_wires_the_frontend_only_when_it_is_configured(site: Path):
    """Import the real app in two subprocesses: configured and not.

    Reloading `app.main` inside this process would keep the already-created
    engine and the routers of the first import, so the wiring is checked the way a
    deployment meets it — a fresh interpreter with an environment.
    """
    def routes(frontend_dir: str) -> str:
        code = (
            "from app.main import app\n"
            "print(sorted({getattr(r, 'path', '') for r in app.routes}))\n"
        )
        environment = {**os.environ}
        if frontend_dir:
            environment["TESSERA_FRONTEND_DIR"] = frontend_dir
        else:
            environment.pop("TESSERA_FRONTEND_DIR", None)
        result = subprocess.run(
            [sys.executable, "-c", code],
            cwd=BACKEND_ROOT,
            env=environment,
            capture_output=True,
            text=True,
            timeout=120,
        )
        assert result.returncode == 0, result.stderr
        return result.stdout

    without = routes("")
    assert "'/{path:path}'" not in without

    with_frontend = routes(str(site))
    assert "'/{path:path}'" in with_frontend
    for prefix in RESERVED_PREFIXES:
        if "/" in prefix:
            assert f"'/{prefix}{{path:path}}'" not in with_frontend


def _guarded_app() -> FastAPI:
    """The middleware on its own, with one HTML route and one JSON route."""
    from fastapi.responses import JSONResponse, HTMLResponse

    app = FastAPI()
    app.middleware("http")(security_headers)

    @app.get("/document", response_class=HTMLResponse)
    def document() -> str:
        return "<!doctype html><title>Tessera</title>"

    @app.get("/json")
    def payload() -> JSONResponse:
        return JSONResponse({"ok": True})

    return app


def test_the_document_carries_a_content_security_policy_and_json_does_not():
    with TestClient(_guarded_app()) as client:
        page = client.get("/document")
        data = client.get("/json")

    policy = page.headers["content-security-policy"]
    assert "default-src 'self'" in policy
    assert "frame-ancestors 'none'" in policy
    assert "content-security-policy" not in data.headers
    # The rest of the headers apply to both.
    for response in (page, data):
        assert response.headers["x-content-type-options"] == "nosniff"
        assert response.headers["x-frame-options"] == "DENY"
        assert response.headers["referrer-policy"] == "no-referrer"


def test_hsts_is_sent_over_tls_and_not_over_plain_http(monkeypatch):
    monkeypatch.setattr("app.headers.config.PRODUCTION", False)
    with TestClient(_guarded_app()) as client:
        assert "strict-transport-security" not in client.get("/json").headers
    with TestClient(_guarded_app(), base_url="https://tessera.test") as secure:
        assert "strict-transport-security" in secure.get("/json").headers


# --------------------------------------------------------------- the artefacts


def test_the_container_runs_migrations_and_the_preflight_before_serving():
    dockerfile = (TESSERA_ROOT / "Dockerfile")
    assert dockerfile.is_file(), "apps/tessera/Dockerfile is the production image"
    text = dockerfile.read_text(encoding="utf-8")

    assert "alembic upgrade head" in text, "schema changes ship as migrations, not create_all"
    assert "app.preflight" in text, "a container that cannot pass preflight must not start"
    assert "TESSERA_FRONTEND_DIR" in text, "the image serves the compiled frontend"
    assert "npm run build" in text, "the frontend is built in the image, not committed as dist"
    assert "uvicorn" in text
    assert "USER" in text, "the process must not run as root"
    # The preflight must come before the server, or it is decorative.
    assert text.index("app.preflight") < text.index("uvicorn")


def test_the_compose_file_starts_the_app_against_postgres():
    compose = (TESSERA_ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    assert re.search(r"^\s{2}app:", compose, re.MULTILINE), "the app service"
    assert "depends_on:" in compose
    assert "condition: service_healthy" in compose
    assert "/health" in compose, "the app has a healthcheck of its own"
    # A local compose run is a development run; a production run is opt-in and the
    # preflight then refuses localhost origins, which is the intended behaviour.
    assert 'TESSERA_PRODUCTION: "${TESSERA_PRODUCTION:-0}"' in compose
    # The dev password in this file must be marked as one.
    assert "development deployment" in compose.lower()


def test_every_setting_the_backend_reads_is_documented():
    """Config drift is silent: an operator cannot set what nobody wrote down."""
    documented = (TESSERA_ROOT / ".env.example").read_text(encoding="utf-8")
    read: set[str] = set()
    for path in sorted((BACKEND_ROOT / "app").glob("*.py")):
        source = path.read_text(encoding="utf-8")
        read |= set(re.findall(r"os\.environ(?:\.get)?\w*\(\s*[\"']([A-Z][A-Z0-9_]+)[\"']", source))
        # `_flag("NAME")` is an indirection over os.environ; missing it would let
        # the two most important variables go undocumented without a failure.
        read |= set(re.findall(r"_flag\(\s*[\"']([A-Z][A-Z0-9_]+)[\"']", source))

    # Documented anywhere an operator would look, not only in one file.
    examples = [
        (TESSERA_ROOT / ".env.example").read_text(encoding="utf-8"),
        (BACKEND_ROOT / ".env.example").read_text(encoding="utf-8"),
        (TESSERA_ROOT / "docker-compose.yml").read_text(encoding="utf-8"),
    ]
    known = set()
    for text in examples:
        known |= set(re.findall(r"^#?\s*([A-Z][A-Z0-9_]+)=", text, re.MULTILINE))
        known |= set(re.findall(r"^\s+([A-Z][A-Z0-9_]+):", text, re.MULTILINE))

    # Environment variables answered by the platform, not by this project.
    exempt = {"PATH", "HOME", "PYTHONPATH"}
    undocumented = sorted(read - exempt - known)
    assert undocumented == []


def test_the_production_settings_appear_with_their_semantics():
    documented = (TESSERA_ROOT / ".env.example").read_text(encoding="utf-8")
    for name in ["TESSERA_PRODUCTION", "TESSERA_COOKIE_SECURE", "TESSERA_COOKIE_SAMESITE", "TESSERA_FRONTEND_DIR"]:
        assert name in documented, name
    assert "preflight" in documented, "the operator is told how to check the instance"
