import { beforeAll, describe, expect, it } from 'vitest';
import { randomUUID, createHash } from 'node:crypto';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { database, withUser } from '../lib/db';
import { hashPassword, createSession, rateLimit } from '../lib/auth';
import { handle } from '../lib/api';
import { runPendingForUser } from '../lib/documents/processor';
import { retrieve } from '../lib/rag/retrieval';
import { runRag } from '../lib/rag/pipeline';
import { INSUFFICIENT } from '../lib/prompts/citation';
import { getObject, putObject } from '../lib/storage';

const a=randomUUID(),b=randomUUID(),ca=randomUUID(),cb=randomUUID();let cookieA='',cookieB='',pdfId='',conversationId='';
const request=(method:string,path:string,cookie:string,body?:unknown)=>new Request(`http://localhost/api/${path}`,{method,headers:{cookie,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
const api=(method:string,path:string,cookie:string,body?:unknown)=>handle(request(method,path,cookie,body),path.split('/'));
beforeAll(async()=>{
  const db=await database();const password=await hashPassword('test-password-123');
  await db.query('INSERT INTO users(id,email,display_name,password_hash,role) VALUES($1,$2,$3,$4,$5)',[a,`${a}@test.example`,'User A',password,'developer']);
  await db.query('INSERT INTO users(id,email,display_name,password_hash) VALUES($1,$2,$3,$4)',[b,`${b}@test.example`,'User B',password]);
  await withUser(a,async tx=>{await tx.query('INSERT INTO collections(id,owner_id,name) VALUES($1,$2,$3)',[ca,a,'User A collection'])});
  await withUser(b,async tx=>{await tx.query('INSERT INTO collections(id,owner_id,name) VALUES($1,$2,$3)',[cb,b,'User B collection'])});
  cookieA=`cv_session=${await createSession(a)}`;cookieB=`cv_session=${await createSession(b)}`;
});
describe('PDF to pgvector to grounded citation',()=>{
  it('uploads, processes, indexes a real PDF and preserves its page',async()=>{
    const pdf=await PDFDocument.create();const page=pdf.addPage();const font=await pdf.embedFont(StandardFonts.Helvetica);page.drawText('The amber observatory uses PostgreSQL row level security to protect private records.',{x:40,y:700,size:12,font});const bytes=await pdf.save();
    const form=new FormData();form.append('collectionId',ca);form.append('file',new File([new Uint8Array(bytes).buffer],'security.pdf',{type:'application/pdf'}));
    const response=await handle(new Request('http://localhost/api/documents',{method:'POST',headers:{cookie:cookieA},body:form}),['documents']);expect(response.status).toBe(202);pdfId=(await response.json()).id;
    expect(await runPendingForUser(a)).toBe(true);
    const rows=await withUser(a,async tx=>(await tx.query('SELECT d.status,c.page_number,c.embedding_model FROM documents d JOIN document_chunks c ON c.document_id=d.id WHERE d.id=$1 AND d.owner_id=$2',[pdfId,a])).rows);
    expect(rows[0].status).toBe('READY');expect(rows[0].page_number).toBe(1);expect(rows[0].embedding_model).toBe('mock-hash-v1-1536');
  });
  it('uses similarity ordering, collection filters and citations tied to actual retrieved chunks',async()=>{
    const result=await retrieve(a,ca,'What protects amber observatory private records?',{strategy:'vector',topK:4,documentId:pdfId});
    expect(result.chunks.length).toBeGreaterThan(0);expect(result.chunks[0].document_id).toBe(pdfId);expect(result.chunks[0].similarity).toBeGreaterThan(0);
    const conversation=await api('POST','conversations',cookieA,{collectionId:ca});expect(conversation.status).toBe(201);conversationId=(await conversation.json()).id;
    const response=await api('POST','chat',cookieA,{conversationId,question:'What protects amber observatory private records?'});expect(response.status).toBe(200);
    const data=await response.json();const answer=data.messages.find((m:any)=>m.role==='ASSISTANT');expect(answer.content).toContain('[1]');expect(answer.citations[0].document_id).toBe(pdfId);expect(answer.citations[0].page_number).toBe(1);expect(answer.citations[0].content).toContain('PostgreSQL');
  });
  it('applies document and tag metadata filters before returning context',async()=>{
    expect((await api('PATCH',`documents/${pdfId}`,cookieA,{tags:['verified']})).status).toBe(200);
    expect((await retrieve(a,ca,'amber private records',{tags:['verified']})).chunks.some(c=>c.document_id===pdfId)).toBe(true);
    expect((await retrieve(a,ca,'amber private records',{tags:['missing']})).chunks).toHaveLength(0);
    expect((await retrieve(a,ca,'amber private records',{documentType:'text/plain'})).chunks).toHaveLength(0);
    expect((await retrieve(a,ca,'amber private records',{createdAfter:'2100-01-01'})).chunks).toHaveLength(0);
  });
  it('answers a follow-up from bounded prior context and rejects unsupported evidence',async()=>{
    const response=await api('POST','chat',cookieA,{conversationId,question:'What does it protect?'});expect(response.status).toBe(200);const data=await response.json();expect(data.messages.at(-1).content).toContain('[1]');
    const result=await runRag(a,ca,'What is the atomic weight of unobtainium?',[]);expect(result.answer).toBe(INSUFFICIENT);expect(result.used).toHaveLength(0);
  });
  it('regenerates the last response without duplicating the user message',async()=>{
    const before=await (await api('GET',`conversations/${conversationId}`,cookieA)).json();const question=before.messages.at(-2).content;
    const response=await api('POST','chat',cookieA,{conversationId,question,mode:'regenerate'});expect(response.status).toBe(200);const after=await response.json();expect(after.messages.length).toBe(before.messages.length);expect(after.messages.at(-1).role).toBe('ASSISTANT');
  });
});
describe('authorization and recovery',()=>{
  it('denies another user access to document, source, conversation, and retrieval scope',async()=>{
    expect((await api('GET',`documents/${pdfId}/file`,cookieB)).status).toBe(404);
    expect((await api('PATCH',`documents/${pdfId}`,cookieB,{filename:'stolen.pdf'})).status).toBe(404);
    expect((await api('GET',`conversations/${conversationId}`,cookieB)).status).toBe(404);
    expect((await api('POST','conversations',cookieB,{collectionId:ca})).status).toBe(404);
    await expect(retrieve(b,ca,'private records')).rejects.toThrow('Collection not found');
    expect((await api('POST','playground',cookieB,{collectionId:cb,question:'records'})).status).toBe(403);
  });
  it('enforces PostgreSQL RLS for a non-bypass role even without an owner WHERE clause',async()=>{
    const db=await database();await db.exec('CREATE ROLE cv_rls_test NOLOGIN NOSUPERUSER NOBYPASSRLS; GRANT USAGE ON SCHEMA public TO cv_rls_test; GRANT SELECT ON documents,document_chunks,collections,conversations TO cv_rls_test; GRANT INSERT ON collections TO cv_rls_test;');
    const result=await db.transaction(async tx=>{await tx.query('SET LOCAL ROLE cv_rls_test');await tx.query("SELECT set_config('app.user_id',$1,true)",[b]);return (await tx.query('SELECT id FROM documents')).rows});
    expect(result.some((r:any)=>r.id===pdfId)).toBe(false);
    const chunks=await db.transaction(async tx=>{await tx.query('SET LOCAL ROLE cv_rls_test');await tx.query("SELECT set_config('app.user_id',$1,true)",[b]);return (await tx.query('SELECT id FROM document_chunks')).rows});expect(chunks).toHaveLength(0);
    await expect(db.transaction(async tx=>{await tx.query('SET LOCAL ROLE cv_rls_test');await tx.query("SELECT set_config('app.user_id',$1,true)",[b]);await tx.query('INSERT INTO collections(id,owner_id,name) VALUES($1,$2,$3)',[randomUUID(),a,'forged']);})).rejects.toThrow();
  });
  it('rejects forged and oversized uploads',async()=>{
    const form=new FormData();form.append('collectionId',ca);form.append('file',new File([Buffer.from('not pdf')],'fake.pdf',{type:'application/pdf'}));
    const r=await handle(new Request('http://localhost/api/documents',{method:'POST',headers:{cookie:cookieA},body:form}),['documents']);expect(r.status).toBe(400);
  });
  it('does not mark a failed provider job READY and retries to a safe failure state',async()=>{
    const form=new FormData();form.append('collectionId',ca);form.append('file',new File(['An indexed source about unique orange widgets.'],'provider.txt',{type:'text/plain'}));
    const response=await handle(new Request('http://localhost/api/documents',{method:'POST',headers:{cookie:cookieA},body:form}),['documents']);const id=(await response.json()).id;
    process.env.EMBEDDING_PROVIDER='openai';delete process.env.OPENAI_API_KEY;
    try {for(let i=0;i<3;i++){await runPendingForUser(a);await withUser(a,async tx=>{await tx.query("UPDATE ingestion_jobs SET available_at=now() WHERE document_id=$1 AND owner_id=$2",[id,a])});}}
    finally {process.env.EMBEDDING_PROVIDER='mock'}
    const row=await withUser(a,async tx=>(await tx.query('SELECT status,error,(SELECT count(*)::int FROM document_chunks WHERE document_id=$1) AS chunks FROM documents WHERE id=$1 AND owner_id=$2',[id,a])).rows[0]);expect(row.status).toBe('FAILED');expect(row.error).toContain('Embedding provider');expect(row.chunks).toBe(0);
  });
  it('rejects altered object contents through checksum validation',async()=>{
    const form=new FormData();form.append('collectionId',ca);form.append('file',new File(['A valid original document.'],'integrity.txt',{type:'text/plain'}));
    const response=await handle(new Request('http://localhost/api/documents',{method:'POST',headers:{cookie:cookieA},body:form}),['documents']);const id=(await response.json()).id;
    const key=await withUser(a,async tx=>(await tx.query('SELECT storage_key FROM documents WHERE id=$1 AND owner_id=$2',[id,a])).rows[0].storage_key);
    await putObject(key,Buffer.from('Altered document contents.'),'text/plain');
    for(let i=0;i<3;i++){await runPendingForUser(a);await withUser(a,async tx=>{await tx.query("UPDATE ingestion_jobs SET available_at=now() WHERE document_id=$1 AND owner_id=$2",[id,a])});}
    const row=await withUser(a,async tx=>(await tx.query('SELECT status,error FROM documents WHERE id=$1 AND owner_id=$2',[id,a])).rows[0]);
    expect(row.status).toBe('FAILED');expect(row.error).toContain('integrity');
  });
  it('reprocesses atomically without duplicate chunks',async()=>{
    const count=async()=>withUser(a,async tx=>(await tx.query('SELECT count(*)::int AS n FROM document_chunks WHERE document_id=$1 AND owner_id=$2',[pdfId,a])).rows[0].n);
    const before=await count();expect(before).toBeGreaterThan(0);
    expect((await api('POST',`documents/${pdfId}/retry`,cookieA)).status).toBe(202);
    await runPendingForUser(a);expect(await count()).toBe(before);
    const doc=await withUser(a,async tx=>(await tx.query('SELECT status FROM documents WHERE id=$1 AND owner_id=$2',[pdfId,a])).rows[0]);expect(doc.status).toBe('READY');
  });
  it('rejects a cross-origin state-changing request',async()=>{
    const req=new Request('http://localhost/api/profile',{method:'POST',headers:{cookie:cookieA,origin:'https://evil.example','content-type':'application/json'},body:JSON.stringify({name:'Forged'})});
    expect((await handle(req,['profile'])).status).toBe(403);
  });
  it('rate limits excessive requests',async()=>{
    const r=new Request('http://localhost/api/auth/login',{headers:{'x-forwarded-for':`test-${randomUUID()}`}});
    await rateLimit(r,'test',2);await rateLimit(r,'test',2);await expect(rateLimit(r,'test',2)).rejects.toThrow('Too many requests');
  });
  it('deletes document chunks and vectors by foreign-key cascade',async()=>{
    const key=await withUser(a,async tx=>(await tx.query('SELECT storage_key FROM documents WHERE id=$1 AND owner_id=$2',[pdfId,a])).rows[0].storage_key);
    const response=await api('DELETE',`documents/${pdfId}`,cookieA);expect(response.status).toBe(200);
    await runPendingForUser(a); await expect(getObject(key)).rejects.toThrow();
    const count=await withUser(a,async tx=>(await tx.query('SELECT count(*)::int AS n FROM document_chunks WHERE document_id=$1 AND owner_id=$2',[pdfId,a])).rows[0].n);expect(count).toBe(0);
    const old=await (await api('GET',`conversations/${conversationId}`,cookieA)).json();expect(old.messages.filter((m:any)=>m.role==='ASSISTANT')[0].citations[0].content).toBeNull();
  });
});
