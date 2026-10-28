// End-to-end test for a DISPOSABLE PostgreSQL + S3-compatible + worker stack.
// It creates and deletes test accounts and objects. Never point it at production.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';

assert.equal(process.env.STACK_TEST_ALLOW_MUTATION, '1', 'Set STACK_TEST_ALLOW_MUTATION=1 only for a disposable test stack.');
assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must be the non-bypass runtime role.');
assert.equal(process.env.STORAGE_PROVIDER, 's3', 'This test requires S3-compatible object storage.');
for (const key of ['S3_BUCKET', 'S3_REGION', 'S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) {
  assert.ok(process.env[key], `${key} is required.`);
}
const mode = process.argv[2];
assert.ok(['create', 'recover', 'verify'].includes(mode), 'Use create, recover, or verify.');
const base = process.env.STACK_BASE_URL || 'http://127.0.0.1:3000';
const statePath = process.env.STACK_STATE_PATH || '/tmp/contextvault-stack-smoke.json';
const password = 'disposable-stack-test-password';
const pdf = await readFile(new URL('../fixtures/stack.pdf', import.meta.url));
const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
});

async function request(method, path, { cookie, json, body } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (json !== undefined) headers['content-type'] = 'application/json';
  return fetch(new URL(`/api/${path}`, base), {
    method, headers, body: json === undefined ? body : JSON.stringify(json), signal: AbortSignal.timeout(30000),
  });
}
async function expectStatus(response, expected, label) {
  if (response.status !== expected) {
    const detail = (await response.text()).slice(0, 400);
    throw new Error(`${label}: expected HTTP ${expected}, got ${response.status}: ${detail}`);
  }
  return response;
}
async function json(method, path, expected, options = {}) {
  return (await expectStatus(await request(method, path, options), expected, `${method} /api/${path}`)).json();
}
function session(response) {
  const value = response.headers.getSetCookie().find((header) => header.startsWith('cv_session='));
  assert.ok(value, 'Authentication did not issue a session cookie.');
  return value.split(';')[0];
}
async function register(email, name) {
  const response = await request('POST', 'auth/register', { json: { email, name, password } });
  await expectStatus(response, 201, 'Registration');
  const cookie = session(response);
  const workspace = await json('GET', 'bootstrap', 200, { cookie });
  assert.equal(workspace.user.email, email);
  return { email, id: workspace.user.id, cookie };
}
async function login(email) {
  const response = await request('POST', 'auth/login', { json: { email, password } });
  await expectStatus(response, 200, 'Login');
  return session(response);
}
async function upload(cookie, collectionId, name, type, data) {
  const form = new FormData();
  form.append('collectionId', collectionId);
  form.append('file', new Blob([data], { type }), name);
  return (await json('POST', 'documents', 202, { cookie, body: form })).id;
}
async function waitForDocuments(owner, documentId) {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const workspace = await json('GET', 'bootstrap', 200, { cookie: owner.cookie });
    const doc = workspace.documents.find((d) => d.id === documentId);
    if (doc?.status === 'READY') {
      assert.ok(doc.chunk_count > 0, 'READY document has no chunks.');
      return workspace;
    }
    if (doc?.status === 'FAILED') throw new Error(`Worker failed to index ${doc.filename}: ${doc.error}`);
    await delay(1500);
  }
  throw new Error('Timed out waiting for the separate worker to index the document.');
}
async function objectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    return true;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound' || error?.name === 'NoSuchKey') return false;
    throw error;
  }
}
async function waitForObjectDeletion(key) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (!await objectExists(key)) return;
    await delay(1500);
  }
  throw new Error('The worker did not drain the object deletion outbox.');
}
async function verifyRuntimeRls(a, b) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  await client.connect();
  try {
    const role = (await client.query(`SELECT current_user AS name, rolsuper, rolbypassrls,
      pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid = 'public.documents'::regclass)) AS table_owner
      FROM pg_roles WHERE rolname = current_user`)).rows[0];
    assert.equal(role.rolsuper, false, 'Runtime role must not be superuser.');
    assert.equal(role.rolbypassrls, false, 'Runtime role must not bypass RLS.');
    assert.notEqual(role.name, role.table_owner, 'Runtime role must not own the tables.');
    const extension = (await client.query("SELECT extversion FROM pg_extension WHERE extname='vector'")).rows[0];
    assert.ok(extension?.extversion, 'pgvector extension is missing.');
    const index = (await client.query("SELECT indexdef FROM pg_indexes WHERE schemaname='public' AND indexname='chunks_embedding_hnsw_idx'")).rows[0];
    assert.match(index?.indexdef || '', /USING hnsw/i, 'The pgvector HNSW index is missing.');
    const ids = [a.document, b.document];
    assert.equal((await client.query('SELECT id FROM documents WHERE id=ANY($1::uuid[])', [ids])).rowCount, 0, 'RLS must fail closed without user context.');
    for (const [owner, other] of [[a, b], [b, a]]) {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.user_id',$1,true)", [owner.id]);
      const rows = (await client.query('SELECT id FROM documents WHERE id=ANY($1::uuid[])', [ids])).rows;
      assert.deepEqual(rows.map((row) => row.id), [owner.document], 'RLS leaked or hid a document without an owner predicate.');
      const chunks = (await client.query('SELECT document_id,(embedding <=> embedding)::float8 AS distance FROM document_chunks WHERE document_id=ANY($1::uuid[])', [ids])).rows;
      assert.ok(chunks.length > 0 && chunks.every((row) => row.document_id === owner.document && Math.abs(row.distance) < 0.00001), 'RLS or pgvector cosine distance failed.');
      await client.query('SAVEPOINT forbidden_write');
      let rejected = false;
      try {
        await client.query('INSERT INTO collections(id,owner_id,name) VALUES($1,$2,$3)', [randomUUID(), other.id, `forged-${randomUUID()}`]);
      } catch (error) {
        rejected = error.code === '42501';
        await client.query('ROLLBACK TO SAVEPOINT forbidden_write');
      }
      assert.ok(rejected, 'RLS must reject a cross-owner write.');
      await client.query('COMMIT');
    }
  } finally {
    await client.end();
  }
}
async function removeTestUsers(a, b) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  await client.connect();
  try { await client.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[a.id, b.id]]); }
  finally { await client.end(); }
}

if (mode === 'create') {
  const ready = await expectStatus(await request('GET', 'health/ready'), 200, 'Readiness');
  assert.equal((await ready.json()).status, 'ready');
  const suffix = randomUUID();
  const a = await register(`stack-a-${suffix}@example.com`, 'Stack A');
  const b = await register(`stack-b-${suffix}@example.com`, 'Stack B');
  a.collection = (await json('POST', 'collections', 201, { cookie: a.cookie, json: { name: `Stack A ${suffix}` } })).id;
  b.collection = (await json('POST', 'collections', 201, { cookie: b.cookie, json: { name: `Stack B ${suffix}` } })).id;
  a.document = await upload(a.cookie, a.collection, 'cobalt.pdf', 'application/pdf', pdf);
  b.document = await upload(b.cookie, b.collection, 'private.txt', 'text/plain', 'The indigo archive has a different private record.');
  const workspaceA = await waitForDocuments(a, a.document);
  const workspaceB = await waitForDocuments(b, b.document);
  assert.ok(!workspaceA.documents.some((d) => d.id === b.document));
  assert.ok(!workspaceB.documents.some((d) => d.id === a.document));
  await expectStatus(await request('GET', `documents/${a.document}/file`, { cookie: b.cookie }), 404, 'Cross-user file access');
  await json('POST', 'conversations', 404, { cookie: b.cookie, json: { collectionId: a.collection } });
  const original = await expectStatus(await request('GET', `documents/${a.document}/file`, { cookie: a.cookie }), 200, 'PDF download');
  assert.deepEqual(Buffer.from(await original.arrayBuffer()), pdf);
  assert.ok(await objectExists(`${a.id}/${a.document}`), 'The uploaded PDF is not in object storage.');
  assert.ok(await objectExists(`${b.id}/${b.document}`), 'The other user’s document is not in object storage.');
  const invalid = new FormData();
  invalid.append('collectionId', a.collection);
  invalid.append('file', new Blob(['not a PDF'], { type: 'application/pdf' }), 'forged.pdf');
  await expectStatus(await request('POST', 'documents', { cookie: a.cookie, body: invalid }), 400, 'Forged PDF');
  a.conversation = (await json('POST', 'conversations', 201, { cookie: a.cookie, json: { collectionId: a.collection } })).id;
  const chat = await json('POST', 'chat', 200, { cookie: a.cookie, json: { conversationId: a.conversation, question: 'What protects cobalt archive documents?' } });
  const answer = chat.messages.find((message) => message.role === 'ASSISTANT');
  assert.match(answer?.content || '', /\[1\]/, 'The answer is not grounded in a citation.');
  assert.ok(answer.citations.some((citation) => citation.document_id === a.document && citation.page_number === 1 && citation.content.includes('access control')), 'The citation does not resolve to the uploaded PDF page.');
  await expectStatus(await request('GET', `conversations/${a.conversation}`, { cookie: b.cookie }), 404, 'Cross-user conversation access');
  await verifyRuntimeRls(a, b);
  // Persist only disposable account identifiers; sessions are reacquired after restart.
  delete a.cookie; delete b.cookie;
  await writeFile(statePath, JSON.stringify({ a, b }), { mode: 0o600, flag: 'wx' });
  console.log('Stack create: PDF ingestion, S3, citations, runtime-role RLS, pgvector, isolation and failure paths passed.');
} else if (mode === 'recover') {
  const { a } = JSON.parse(await readFile(statePath, 'utf8'));
  a.cookie = await login(a.email);
  const document = await upload(a.cookie, a.collection, 'recovery.txt', 'text/plain', 'The emerald archive confirms worker recovery after a database outage.');
  await waitForDocuments(a, document);
  assert.ok(await objectExists(`${a.id}/${document}`), 'The recovery document was not stored.');
  await json('DELETE', `documents/${document}`, 200, { cookie: a.cookie });
  await waitForObjectDeletion(`${a.id}/${document}`);
  console.log('Stack recover: the same worker resumed ingestion and deletion after the database outage.');
} else {
  const { a, b } = JSON.parse(await readFile(statePath, 'utf8'));
  a.cookie = await login(a.email); b.cookie = await login(b.email);
  const workspace = await waitForDocuments(a, a.document);
  assert.ok(workspace.documents.some((doc) => doc.id === a.document), 'Document did not persist across restart.');
  const source = await expectStatus(await request('GET', `documents/${a.document}/file`, { cookie: a.cookie }), 200, 'Persisted PDF download');
  assert.deepEqual(Buffer.from(await source.arrayBuffer()), pdf, 'Object bytes changed across restart.');
  const conversation = await json('GET', `conversations/${a.conversation}`, 200, { cookie: a.cookie });
  assert.ok(conversation.messages.some((message) => message.role === 'ASSISTANT' && message.citations.some((citation) => citation.document_id === a.document)), 'Conversation/citation did not persist across restart.');
  await expectStatus(await request('GET', `documents/${a.document}/file`, { cookie: b.cookie }), 404, 'Persisted cross-user isolation');
  await verifyRuntimeRls(a, b);
  for (const owner of [a, b]) {
    await json('DELETE', `documents/${owner.document}`, 200, { cookie: owner.cookie });
    await waitForObjectDeletion(`${owner.id}/${owner.document}`);
    await json('DELETE', `collections/${owner.collection}`, 200, { cookie: owner.cookie });
  }
  await removeTestUsers(a, b);
  await unlink(statePath);
  console.log('Stack verify: database/object persistence, isolation and durable object deletion passed.');
}
s3.destroy();
