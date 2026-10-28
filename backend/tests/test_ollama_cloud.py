import asyncio
import json
import httpx
import pytest
from ollama import Client
from synapsehub import ollama_cloud
from synapsehub.rag import generate_answer
from fastapi import HTTPException


def mock_sdk(monkeypatch, handler):
    # Exercise the actual official SDK serialization/auth against a mock transport.
    monkeypatch.setattr(ollama_cloud, 'Client', lambda **kwargs: Client(transport=httpx.MockTransport(handler), **kwargs))


def test_cloud_auth_model_and_non_streaming_without_unsupported_schema(monkeypatch):
    monkeypatch.setenv('OLLAMA_API_KEY', 'test-cloud-key-not-real')
    def handler(req):
        assert str(req.url) == 'https://ollama.com/api/chat'
        assert req.headers['authorization'] == 'Bearer test-cloud-key-not-real'
        data = json.loads(req.content)
        assert data['model'] == 'gemma4:31b'
        assert data['stream'] is False
        assert 'format' not in data
        return httpx.Response(200, json={'message': {'role': 'assistant', 'content': 'transport fixture'}, 'done': True})
    mock_sdk(monkeypatch, handler)
    assert ollama_cloud.cloud_chat([{'role': 'user', 'content': 'test'}]) == 'transport fixture'


def test_empty_key_fails_before_sdk_without_fallback(monkeypatch):
    monkeypatch.delenv('OLLAMA_API_KEY', raising=False)
    monkeypatch.setenv('OPENAI_API_KEY', 'never-forward-this')
    monkeypatch.setenv('ANTHROPIC_API_KEY', 'never-forward-this-either')
    monkeypatch.setattr(ollama_cloud, 'Client', lambda **kwargs: pytest.fail('SDK must not be constructed'))
    with pytest.raises(ollama_cloud.CloudError, match='OLLAMA_API_KEY'):
        ollama_cloud.cloud_chat([])


@pytest.mark.parametrize('status', [401, 402, 404, 429])
def test_cloud_statuses_are_sanitized_and_not_retried(monkeypatch, status):
    monkeypatch.setenv('OLLAMA_API_KEY', 'test-cloud-key-not-real')
    calls = []
    def handler(req):
        calls.append(req)
        return httpx.Response(status, json={'error': 'untrusted provider body test-cloud-key-not-real'})
    mock_sdk(monkeypatch, handler)
    with pytest.raises(ollama_cloud.CloudError) as exc:
        ollama_cloud.cloud_chat([])
    assert exc.value.status_code == status
    assert 'test-cloud-key-not-real' not in str(exc.value)
    assert 'untrusted provider body' not in str(exc.value)
    assert len(calls) == 1


def test_cloud_network_failure_is_sanitized(monkeypatch):
    monkeypatch.setenv('OLLAMA_API_KEY', 'test-cloud-key-not-real')
    def handler(req):
        raise httpx.ConnectError('sensitive transport details', request=req)
    mock_sdk(monkeypatch, handler)
    with pytest.raises(ollama_cloud.CloudError, match='Cannot connect'):
        ollama_cloud.cloud_chat([])


def test_cloud_rag_still_validates_citations(monkeypatch):
    row = {'id': '11111111-1111-4111-8111-111111111111', 'document_id': '22222222-2222-4222-8222-222222222222', 'page': 1, 'text': 'Voltage is measured in volts.'}
    content = {'claims': [{'text': 'Voltage uses volts.', 'citation_id': row['id'], 'quote': row['text']}]}
    monkeypatch.setattr('synapsehub.rag.cloud_chat', lambda messages: json.dumps(content))
    assert asyncio.run(generate_answer('Which unit?', [row], provider='cloud'))[0]['page'] == 1
    content['claims'][0]['quote'] = 'Invented source quotation.'
    with pytest.raises(HTTPException) as exc:
        asyncio.run(generate_answer('Which unit?', [row], provider='cloud'))
    assert exc.value.status_code == 502


def test_local_endpoint_never_receives_cloud_key(monkeypatch):
    monkeypatch.setenv('OLLAMA_API_KEY', 'test-cloud-key-not-real')
    monkeypatch.delenv('OLLAMA_LOCAL_API_KEY', raising=False)
    monkeypatch.setenv('OLLAMA_URL', 'http://local.test')
    monkeypatch.setenv('OLLAMA_MODEL', 'local-model')
    def handler(req):
        assert 'authorization' not in req.headers
        return httpx.Response(200, json={'message': {'content': '{"claims": []}'}})
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))
    assert asyncio.run(generate_answer('test', [], provider='local')) == []
