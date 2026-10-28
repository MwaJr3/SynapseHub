import { describe, expect, it, vi } from 'vitest';
import { randomUUID, createHash } from 'node:crypto';
import { database, withUser } from '../lib/db';
import { MockEmbeddingProvider } from '../lib/ai/embeddings';
import { putObject } from '../lib/storage';
import { runPendingForUser } from '../lib/documents/processor';

async function fixture() {
  const owner=randomUUID(), collection=randomUUID(), document=randomUUID(), job=randomUUID(), key=`${owner}/${document}`;
  const content='The peridot archive maintains a durable record of all approved changes.';
  await (await database()).query('INSERT INTO users(id,email,display_name,password_hash) VALUES($1,$2,$3,$4)',[owner,`${owner}@test.example`,'Owner','unused']);
  await putObject(key,Buffer.from(content),'text/plain');
  await withUser(owner,async tx=>{
    await tx.query('INSERT INTO collections(id,owner_id,name) VALUES($1,$2,$3)',[collection,owner,'Worker test']);
    await tx.query(`INSERT INTO documents(id,owner_id,collection_id,filename,content_type,file_size,storage_key,checksum) VALUES($1,$2,$3,'archive.txt','text/plain',$4,$5,$6)`,[document,owner,collection,Buffer.byteLength(content),key,createHash('sha256').update(content).digest('hex')]);
    await tx.query('INSERT INTO ingestion_jobs(id,owner_id,document_id) VALUES($1,$2,$3)',[job,owner,document]);
  });
  const vector=(await new MockEmbeddingProvider().embed([content])).vectors[0];
  const success=()=>new Response(JSON.stringify({data:[{embedding:vector}]}),{status:200,headers:{'Content-Type':'application/json'}});
  const expire=()=>withUser(owner,async tx=>{await tx.query("UPDATE ingestion_jobs SET locked_at=now()-interval '6 minutes' WHERE id=$1 AND owner_id=$2",[job,owner])});
  const state=()=>withUser(owner,async tx=>({
    job:(await tx.query('SELECT status,attempts FROM ingestion_jobs WHERE id=$1 AND owner_id=$2',[job,owner])).rows[0],
    doc:(await tx.query('SELECT status,progress FROM documents WHERE id=$1 AND owner_id=$2',[document,owner])).rows[0],
    chunks:(await tx.query('SELECT id,content FROM document_chunks WHERE document_id=$1 AND owner_id=$2 ORDER BY chunk_index',[document,owner])).rows,
  }));
  return {owner,success,expire,state};
}
function gate() {let open!:(r:Response)=>void,started!:()=>void;const response=new Promise<Response>(r=>{open=r}),entered=new Promise<void>(r=>{started=r});return {response,entered,started,open};}

describe('expired ingestion lease fencing',()=>{
  it('prevents an old worker from replacing chunks committed by a newer attempt',async()=>{
    const f=await fixture(), first=gate();let calls=0;
    const fetchMock=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>{calls++;if(calls===1){first.started();return first.response}return f.success()});
    process.env.EMBEDDING_PROVIDER='local';
    try {
      const old=runPendingForUser(f.owner);await first.entered;await f.expire();
      await runPendingForUser(f.owner);
      const before=await f.state();expect(before.job).toMatchObject({status:'DONE',attempts:2});expect(before.doc.status).toBe('READY');expect(before.chunks).toHaveLength(1);
      first.open(f.success());await old;
      const after=await f.state();expect(after.chunks).toEqual(before.chunks);expect(after.doc).toEqual(before.doc);expect(after.job).toEqual(before.job);
    } finally {process.env.EMBEDDING_PROVIDER='mock';fetchMock.mockRestore();}
  });
  it('prevents an old failure from requeuing or resetting the active replacement',async()=>{
    const f=await fixture(),first=gate(),second=gate();let calls=0;
    const fetchMock=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>{calls++;const g=calls===1?first:second;g.started();return g.response});
    process.env.EMBEDDING_PROVIDER='local';
    try {
      const old=runPendingForUser(f.owner);await first.entered;await f.expire();
      const current=runPendingForUser(f.owner);await second.entered;
      first.open(new Response('unavailable',{status:503}));await old;
      const during=await f.state();expect(during.job).toMatchObject({status:'PROCESSING',attempts:2});expect(during.doc.status).toBe('EMBEDDING');
      second.open(f.success());await current;
      const after=await f.state();expect(after.job).toMatchObject({status:'DONE',attempts:2});expect(after.doc.status).toBe('READY');
    } finally {process.env.EMBEDDING_PROVIDER='mock';fetchMock.mockRestore();}
  });
});
