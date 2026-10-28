import { beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { database, withUser } from '../lib/db';
import { MockEmbeddingProvider, vectorLiteral } from '../lib/ai/embeddings';
import { retrieve } from '../lib/rag/retrieval';
import { runRag } from '../lib/rag/pipeline';
import { handle } from '../lib/api';
import { createSession } from '../lib/auth';

const owner=randomUUID(), other=randomUUID(), collection=randomUUID(), document=randomUUID(), chunk=randomUUID();
let ownerCookie='',otherCookie='';
const content='The cobaltorbit protocol identifies a research archive and protects its private records through access controls.';

beforeAll(async()=>{
  const db=await database();
  await db.query('INSERT INTO users(id,email,display_name,password_hash) VALUES($1,$2,$3,$4),($5,$6,$7,$8)',[owner,`${owner}@test.example`,'Owner','unused',other,`${other}@test.example`,'Other','unused']);
  await db.query("UPDATE users SET role='developer' WHERE id=$1",[owner]);
  ownerCookie=`cv_session=${await createSession(owner)}`;otherCookie=`cv_session=${await createSession(other)}`;
  const provider=new MockEmbeddingProvider();const {vectors}=await provider.embed([content]);
  await withUser(owner,async tx=>{
    await tx.query('INSERT INTO collections(id,owner_id,name) VALUES($1,$2,$3)',[collection,owner,'Test collection']);
    await tx.query(`INSERT INTO documents(id,owner_id,collection_id,filename,content_type,file_size,storage_key,checksum,status,progress) VALUES($1,$2,$3,'evidence.txt','text/plain',100,$4,'checksum','READY',100)`,[document,owner,collection,`${owner}/${document}`]);
    await tx.query(`INSERT INTO document_chunks(id,document_id,collection_id,owner_id,chunk_index,content,token_count,embedding_model,embedding) VALUES($1,$2,$3,$4,0,$5,20,$6,$7::vector)`,[chunk,document,collection,owner,content,provider.model,vectorLiteral(vectors[0])]);
  });
});

describe('retrieval strategy boundaries',()=>{
  it('runs keyword search without an embedding provider or matching embedding model',async()=>{
    process.env.EMBEDDING_PROVIDER='openai';delete process.env.OPENAI_API_KEY;
    try {
      const result=await retrieve(owner,collection,'cobaltorbit',{strategy:'keyword'});
      expect(result.chunks.map(c=>c.id)).toEqual([chunk]);
      expect(result.chunks[0].similarity).toBeNull();
      expect(result.chunks[0].lexical_score).toBeGreaterThan(0);
      expect(result.model).toBeNull();
    } finally { process.env.EMBEDDING_PROVIDER='mock'; }
  });
  it('retains lexical matches in hybrid search when they fall below the vector threshold',async()=>{
    const result=await retrieve(owner,collection,'cobaltorbit',{strategy:'hybrid',threshold:1});
    expect(result.chunks.map(c=>c.id)).toEqual([chunk]);
    expect(result.chunks[0].similarity).toBeLessThan(1);
    expect(result.chunks[0].lexical_score).toBeGreaterThan(0);
  });
  it('uses old-model chunks for lexical matches without comparing incompatible vectors',async()=>{
    await withUser(owner,async tx=>{await tx.query("UPDATE document_chunks SET embedding_model='legacy-model' WHERE id=$1 AND owner_id=$2",[chunk,owner])});
    try {
      const hybrid=await retrieve(owner,collection,'cobaltorbit',{strategy:'hybrid'});
      expect(hybrid.chunks.map(c=>c.id)).toEqual([chunk]);expect(hybrid.chunks[0].similarity).toBeNull();
      expect((await retrieve(owner,collection,'cobaltorbit',{strategy:'vector'})).chunks).toEqual([]);
    } finally {await withUser(owner,async tx=>{await tx.query("UPDATE document_chunks SET embedding_model='mock-hash-v1-1536' WHERE id=$1 AND owner_id=$2",[chunk,owner])});}
  });
  it('does not record a generation request when no evidence was found',async()=>{
    const count=()=>withUser(owner,async tx=>(await tx.query("SELECT count(*)::int AS n FROM usage_events WHERE owner_id=$1 AND kind='generation'",[owner])).rows[0].n);
    const before=await count();const result=await runRag(owner,collection,'unmatched zephyriumnothing',[],{threshold:1});
    expect(result.chunks).toEqual([]);expect(await count()).toBe(before);
  });
  it('still rejects an unauthorized collection before searching',async()=>{
    await expect(retrieve(other,collection,'cobaltorbit',{strategy:'keyword'})).rejects.toThrow('Collection not found.');
  });
});

const compare=(cookie:string,collectionId=collection)=>handle(new Request('http://localhost/api/retrieval/compare',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({collectionId,question:'cobaltorbit',topK:4,threshold:0})}),['retrieval','compare']);
describe('retrieval comparison',()=>{
  it('compares the same scoped query with a single embedding and no generation call',async()=>{
    const before=await withUser(owner,async tx=>(await tx.query("SELECT kind,count(*)::int AS n FROM usage_events WHERE owner_id=$1 GROUP BY kind",[owner])).rows);
    const response=await compare(ownerCookie);expect(response.status).toBe(200);const data=await response.json();
    expect(data.results.map((r:any)=>r.strategy)).toEqual(['keyword','vector','hybrid']);
    expect(data.results.every((r:any)=>r.chunks[0]?.id===chunk)).toBe(true);
    expect(data.results[0].chunks[0].similarity).toBeNull();
    expect(data.results[1].chunks[0].similarity).toBeGreaterThan(0);
    expect(data.embeddingMs).toEqual(expect.any(Number));
    const after=await withUser(owner,async tx=>(await tx.query("SELECT kind,count(*)::int AS n FROM usage_events WHERE owner_id=$1 GROUP BY kind",[owner])).rows);
    const count=(rows:any[],kind:string)=>rows.find(r=>r.kind===kind)?.n||0;
    expect(count(after,'query_embedding')-count(before,'query_embedding')).toBe(1);
    expect(count(after,'generation')-count(before,'generation')).toBe(0);
  });
  it('shows keyword results even when vector embedding is unavailable',async()=>{
    process.env.EMBEDDING_PROVIDER='openai';delete process.env.OPENAI_API_KEY;
    try {
      const response=await compare(ownerCookie);expect(response.status).toBe(200);const data=await response.json();
      expect(data.results[0].chunks[0].id).toBe(chunk);expect(data.results[0].error).toBeNull();
      expect(data.results[1].error).toMatch(/embedding provider/i);expect(data.results[2].error).toMatch(/embedding provider/i);
    } finally {process.env.EMBEDDING_PROVIDER='mock';}
  });
  it('requires developer access and rejects another user’s collection before searching',async()=>{
    expect((await compare(otherCookie)).status).toBe(403);
    await (await database()).query("UPDATE users SET role='developer' WHERE id=$1",[other]);
    try {expect((await compare(otherCookie)).status).toBe(404);}
    finally {await (await database()).query("UPDATE users SET role='user' WHERE id=$1",[other]);}
  });
});
