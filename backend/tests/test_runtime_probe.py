import asyncio
import importlib.util
from pathlib import Path
import httpx
import pytest

spec = importlib.util.spec_from_file_location('runtime_probe', Path(__file__).parents[1] / 'scripts' / 'check_runtime.py')
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


def transport(monkeypatch, handler):
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kw: original(transport=httpx.MockTransport(handler), **kw))


def test_probe_checks_reachability_and_anonymous_denial(monkeypatch):
    monkeypatch.setenv('SUPABASE_URL', 'https://supabase.test')
    monkeypatch.setenv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
    def handler(req):
        assert req.headers['apikey'] == 'sb_publishable_test'
        return httpx.Response(200, json={'mailer_autoconfirm': False}) if '/settings' in req.url.path else httpx.Response(401)
    transport(monkeypatch, handler)
    assert asyncio.run(probe.probe(cloud=True)) == ['supabase_auth_reachable_confirmation_required', 'anonymous_library_access_denied']


def test_probe_rejects_email_verification_disabled(monkeypatch):
    monkeypatch.setenv('SUPABASE_URL', 'https://supabase.test')
    monkeypatch.setenv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
    transport(monkeypatch, lambda req: httpx.Response(200, json={'mailer_autoconfirm': True}))
    with pytest.raises(ValueError, match='confirmation'):
        asyncio.run(probe.probe(cloud=True))


def test_probe_requires_installed_model_and_sends_server_only_key(monkeypatch):
    monkeypatch.setenv('OLLAMA_URL', 'https://ollama.test')
    monkeypatch.setenv('OLLAMA_MODEL', 'model:4b')
    monkeypatch.setenv('OLLAMA_API_KEY', 'synthetic-private-key')
    def handler(req):
        assert req.headers['authorization'] == 'Bearer synthetic-private-key'
        return httpx.Response(200, json={'models': [{'name': 'other:latest'}]})
    transport(monkeypatch, handler)
    with pytest.raises(ValueError, match='not installed'):
        asyncio.run(probe.probe(ollama=True))


def test_probe_never_calls_generation_without_explicit_flag(monkeypatch):
    monkeypatch.setenv('OLLAMA_URL', 'https://ollama.test')
    monkeypatch.setenv('OLLAMA_MODEL', 'model:4b')
    requests = []
    def handler(req):
        requests.append(req)
        return httpx.Response(200, json={'models': [{'name': 'model:4b'}]})
    transport(monkeypatch, handler)
    assert asyncio.run(probe.probe(ollama=True)) == ['ollama_model_available']
    assert len(requests) == 1
    assert requests[0].method == 'GET'
