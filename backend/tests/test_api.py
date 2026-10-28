import asyncio
import json
from io import BytesIO
from uuid import uuid4
import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from reportlab.pdfgen.canvas import Canvas
from synapsehub.main import app, authenticated, recent
from synapsehub.models import Workspace
from synapsehub.pdf import extract_pdf, bounded_extract, MAX_BYTES
from synapsehub.rag import generate_answer
from synapsehub.gateway import Gateway


def pdf_bytes(lines=None):
    stream = BytesIO()
    canvas = Canvas(stream)
    for text in lines or ['Current is conserved at a junction.', 'Voltage is measured in volts.']:
        canvas.drawString(60, 750, text)
        canvas.showPage()
    canvas.save()
    return stream.getvalue()


class FakeGateway:
    token = 'isolated-test-user'
    def __init__(self):
        self.revision = 0
        self.workspace = {'version': 1, 'revision': 0, 'items': [], 'relations': []}
        self.docs = {}
        self.chunks = []
        self.excluded = False

    async def get_workspace(self):
        return {'revision': self.revision, 'payload': self.workspace}

    async def documents(self):
        return list(self.docs.values())

    async def document(self, doc_id):
        if doc_id not in self.docs:
            raise HTTPException(404, 'not found')
        return self.docs[doc_id]

    async def delete_document(self, doc_id):
        self.docs.pop(doc_id, None)
        self.chunks = [c for c in self.chunks if c['document_id'] != doc_id]

    async def rpc(self, name, args):
        if name == 'sh_save_workspace':
            if args['expected_revision'] != self.revision:
                return []
            self.revision += 1
            self.workspace = args['new_payload']
            return [{'revision': self.revision}]
        if name == 'sh_ingest_pdf':
            import base64
            doc_id = args['doc_id']
            self.docs[doc_id] = {'id': doc_id, 'title': args['doc_title'], 'pages': args['page_count'], 'pdf': '\\x' + base64.b64decode(args['pdf_base64']).hex()}
            self.chunks += [{**c, 'id': str(uuid4()), 'document_id': doc_id, 'title': args['doc_title'], 'rank': 1} for c in args['chunks']]
            return doc_id
        if name == 'sh_search_chunks':
            if self.excluded:
                return [{'document_id': str(uuid4())}]
            return [c for c in self.chunks if c['document_id'] in args['selected_sources'] and args['question'].lower() in c['text'].lower()]
        raise AssertionError(name)


@pytest.fixture
def client():
    gateway = FakeGateway()
    recent.clear()
    app.dependency_overrides[authenticated] = lambda: gateway
    with TestClient(app) as c:
        yield c, gateway
    app.dependency_overrides.clear()


def test_auth_required():
    with TestClient(app) as c:
        for path in ['/api/workspace', '/api/documents', f'/api/documents/{uuid4()}/pdf']:
            assert c.get(path).status_code == 401


def test_sync_validates_and_rejects_conflicts(client):
    c, gateway = client
    payload = {'expected_revision': 0, 'workspace': gateway.workspace}
    assert c.put('/api/workspace', json=payload).json() == {'revision': 1}
    assert c.put('/api/workspace', json=payload).status_code == 409
    assert c.get('/api/workspace').json()['revision'] == 1
    bad = {**payload, 'expected_revision': 1, 'workspace': {**gateway.workspace, 'relations': [{'from': str(uuid4()), 'to': str(uuid4()), 'type': 'derived-from'}]}}
    assert c.put('/api/workspace', json=bad).status_code == 422
    assert gateway.revision == 1


def test_pdf_page_citations_and_deletion(client):
    c, gateway = client
    data = pdf_bytes()
    response = c.post('/api/documents', files={'file': ('lecture.pdf', data, 'application/pdf')})
    assert response.status_code == 201, response.text
    doc = response.json()
    assert doc['pages'] == 2
    ask = c.post('/api/ask', json={'question': 'Voltage', 'source_ids': [doc['id']]}).json()
    assert ask['evidence'][0]['page'] == 2
    assert ask['claims'] == []
    excluded = c.post('/api/ask', json={'question': 'Voltage', 'source_ids': [str(uuid4())]}).json()
    assert excluded['evidence'] == []
    assert 'No matching evidence' in excluded['message']
    original = c.get(f"/api/documents/{doc['id']}/pdf")
    assert original.content == data
    assert original.headers['cache-control'] == 'no-store'
    assert c.delete(f"/api/documents/{doc['id']}").status_code == 204
    assert c.get(f"/api/documents/{doc['id']}/pdf").status_code == 404
    assert not gateway.chunks


def test_ingest_invalid_and_bounded(client):
    c, _ = client
    assert c.post('/api/documents', files={'file': ('fake.pdf', b'not pdf')}).status_code == 422
    assert c.post('/api/documents', files={'file': ('big.pdf', b'X' * (MAX_BYTES + 1))}).status_code == 413
    with pytest.raises(ValueError, match='No extractable text'):
        extract_pdf(pdf_bytes(['']))
    with pytest.raises(ValueError, match='1–100'):
        extract_pdf(pdf_bytes(['x'] * 101))
    assert bounded_extract(pdf_bytes())['chunks'][1]['page'] == 2


def test_rag_requires_consent_and_blocks_excluded_source(client):
    c, gateway = client
    body = {'question': 'Voltage', 'source_ids': [str(uuid4())], 'generate': True}
    assert c.post('/api/ask', json=body).status_code == 422
    gateway.excluded = True
    body['consent'] = True
    assert c.post('/api/ask', json=body).status_code == 502
    assert c.post('/api/ask', json={**body, 'source_ids': []}).status_code == 422


def test_throttle(client):
    c, _ = client
    body = {'question': 'Voltage', 'source_ids': [str(uuid4())]}
    for _ in range(10):
        assert c.post('/api/ask', json=body).status_code == 200
    assert c.post('/api/ask', json=body).status_code == 429


def test_ai_citation_validation(monkeypatch):
    monkeypatch.setenv('OLLAMA_URL', 'http://inference.test')
    monkeypatch.setenv('OLLAMA_MODEL', 'test-model')
    evidence = [{'id': str(uuid4()), 'document_id': str(uuid4()), 'page': 2, 'text': 'Voltage is measured in volts.'}]
    content = {'claims': [{'text': 'Voltage uses volts.', 'citation_id': evidence[0]['id'], 'quote': evidence[0]['text']}]}
    captured = []
    def handler(request):
        captured.append(json.loads(request.content))
        return httpx.Response(200, json={'message': {'content': json.dumps(content)}})
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))
    assert asyncio.run(generate_answer('What units?', evidence))[0]['page'] == 2
    assert captured[0]['stream'] is False
    content['claims'][0]['citation_id'] = str(uuid4())
    with pytest.raises(HTTPException) as failure:
        asyncio.run(generate_answer('What units?', evidence))
    assert failure.value.status_code == 502
    content['claims'][0]['citation_id'] = evidence[0]['id']
    content['claims'][0]['quote'] = 'This invented quotation is not in the source.'
    with pytest.raises(HTTPException):
        asyncio.run(generate_answer('What units?', evidence))


def test_ai_not_configured_no_fallback(monkeypatch):
    monkeypatch.delenv('OLLAMA_URL', raising=False)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(generate_answer('Question', []))
    assert exc.value.status_code == 503


def test_gateway_forwards_user_token_and_rejects_expiry(monkeypatch):
    monkeypatch.setenv('SUPABASE_URL', 'https://cloud.test')
    monkeypatch.setenv('SUPABASE_PUBLISHABLE_KEY', 'publishable-test-key')
    seen = []
    def handler(request):
        seen.append(request)
        return httpx.Response(401, json={})
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))
    with pytest.raises(HTTPException) as exc:
        asyncio.run(Gateway('user-jwt').verify())
    assert exc.value.status_code == 401
    assert seen[0].headers['authorization'] == 'Bearer user-jwt'
    assert seen[0].headers['apikey'] == 'publishable-test-key'


def test_workspace_rejects_unsafe_urls():
    with pytest.raises(ValueError):
        Workspace.model_validate({'version': 1, 'revision': 0, 'items': [{'id': str(uuid4()), 'kind': 'source', 'title': 'X', 'body': '', 'createdAt': '2026-10-28T10:00:00Z', 'url': 'javascript:alert(1)'}], 'relations': []})
