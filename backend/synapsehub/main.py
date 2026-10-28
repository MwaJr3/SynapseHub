import asyncio
import base64
import hashlib
import os
import time
from collections import defaultdict, deque
from uuid import UUID, uuid4
from fastapi import Depends, FastAPI, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from .gateway import Gateway
from .models import AskRequest, SyncRequest, Workspace
from .pdf import MAX_BYTES, bounded_extract
from .rag import generate_answer

app = FastAPI(title='SynapseHub API', version='0.2.0')
pdf_slots = asyncio.Semaphore(2)
origins = [o.strip() for o in os.getenv('CORS_ORIGINS', '').split(',') if o.strip()]
if origins:
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=['GET', 'POST', 'PUT', 'DELETE'], allow_headers=['Authorization', 'Content-Type'])


@app.middleware('http')
async def bounded_body(request: Request, call_next):
    # Bound non-multipart requests, including chunked transfer bodies. Uploads have a
    # streaming cap at the ASGI receive boundary before multipart parsing.
    limit = MAX_BYTES + 65536 if request.url.path == '/api/documents' else 2200000
    received = 0
    receive = request._receive

    async def limited_receive():
        nonlocal received
        message = await receive()
        received += len(message.get('body', b''))
        if received > limit:
            raise HTTPException(413, 'Request exceeds size limit.')
        return message

    try:
        length = int(request.headers.get('content-length', '0') or 0)
    except ValueError:
        return Response('Invalid Content-Length.', status_code=400)
    if length < 0:
        return Response('Invalid Content-Length.', status_code=400)
    if length > limit:
        return Response('Request exceeds size limit.', status_code=413)
    request._receive = limited_receive
    return await call_next(request)


async def authenticated(authorization: str = Header(default='')):
    if not authorization.startswith('Bearer ') or len(authorization) > 8192:
        raise HTTPException(401, 'Sign in to continue.')
    return await Gateway(authorization[7:]).verify()


# Per-process safety throttle. Production requires shared rate limiting at ingress.
recent: dict[str, deque] = defaultdict(deque)

def rate_limit(token, kind, limit):
    now = time.monotonic()
    key = hashlib.sha256(token.encode()).hexdigest() + kind
    if len(recent) > 10000:
        for k in list(recent):
            if not recent[k] or now - recent[k][-1] > 60:
                del recent[k]
    q = recent[key]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(429, 'Too many requests. Wait one minute.')
    q.append(now)


@app.get('/api/health')
def health():
    return {'status': 'ok', 'cloud_configured': bool(os.getenv('SUPABASE_URL') and os.getenv('SUPABASE_PUBLISHABLE_KEY')), 'ai_configured': bool(os.getenv('OLLAMA_URL') and os.getenv('OLLAMA_MODEL')), 'max_pdf_bytes': MAX_BYTES}


@app.get('/api/workspace')
async def get_workspace(gateway=Depends(authenticated)):
    record = await gateway.get_workspace()
    payload = Workspace.model_validate(record['payload']).model_dump(mode='json', by_alias=True)
    return {'revision': record['revision'], 'workspace': payload}


@app.put('/api/workspace')
async def put_workspace(body: SyncRequest, gateway=Depends(authenticated)):
    rate_limit(gateway.token, 'sync', 60)
    payload = body.workspace.model_dump(mode='json', by_alias=True)
    result = await gateway.rpc('sh_save_workspace', {'expected_revision': body.expected_revision, 'new_payload': payload})
    if not result:
        raise HTTPException(409, 'Cloud workspace changed. Download the cloud copy or export local changes before resolving the conflict.')
    return {'revision': result[0]['revision']}


@app.get('/api/documents')
async def documents(gateway=Depends(authenticated)):
    return await gateway.documents()


@app.post('/api/documents', status_code=201)
async def ingest(file: UploadFile, gateway=Depends(authenticated)):
    rate_limit(gateway.token, 'ingest', 5)
    data = await file.read(MAX_BYTES + 1)
    await file.close()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, f'PDF exceeds {MAX_BYTES // (1024 * 1024)} MiB.')
    title = (file.filename or 'Untitled PDF').replace('\\', '/').split('/')[-1][:200]
    try:
        async with pdf_slots:
            result = await asyncio.to_thread(bounded_extract, data)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    doc_id = await gateway.rpc('sh_ingest_pdf', {
        'doc_id': str(uuid4()), 'doc_title': title or 'Untitled PDF',
        'digest': hashlib.sha256(data).hexdigest(),
        'pdf_base64': base64.b64encode(data).decode(),
        'page_count': result['pages'], 'chunks': result['chunks'],
    })
    return {'id': doc_id, 'title': title, 'pages': result['pages'], 'status': 'partial' if result['empty_pages'] else 'completed', 'empty_pages': result['empty_pages']}


@app.get('/api/documents/{document_id}/pdf')
async def pdf(document_id: UUID, gateway=Depends(authenticated)):
    doc = await gateway.document(str(document_id))
    data = bytes.fromhex(doc['pdf'].removeprefix('\\x'))
    return Response(data, media_type='application/pdf', headers={'Content-Disposition': 'inline; filename="source.pdf"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'})


@app.delete('/api/documents/{document_id}', status_code=204)
async def delete_document(document_id: UUID, gateway=Depends(authenticated)):
    await gateway.delete_document(str(document_id))
    return Response(status_code=204)


@app.post('/api/ask')
async def ask(body: AskRequest, gateway=Depends(authenticated)):
    rate_limit(gateway.token, 'ask', 10)
    if body.generate and not body.consent:
        raise HTTPException(422, 'Explicit consent is required to send retrieved excerpts to the configured inference service.')
    selected = {str(i) for i in body.source_ids}
    evidence = await gateway.rpc('sh_search_chunks', {'question': body.question, 'selected_sources': sorted(selected)})
    # Defense in depth: reject, not just hide, an adapter returning excluded sources.
    if any(str(row['document_id']) not in selected for row in evidence):
        raise HTTPException(502, 'Retrieval returned an excluded source; answer blocked.')
    claims = await generate_answer(body.question, evidence) if body.generate and evidence else []
    return {'mode': 'generated' if body.generate else 'evidence', 'evidence': evidence, 'claims': claims,
            'message': 'No matching evidence in selected sources.' if not evidence else ('AI claims require your review; quote validation is not proof of entailment.' if body.generate else 'Retrieved passages, not an AI-generated answer.')}
