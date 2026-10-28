import { beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { database, withUser } from '../lib/db';
import { createSession } from '../lib/auth';
import { handle } from '../lib/api';
import { LocalEmbeddingProvider, MockEmbeddingProvider, vectorLiteral } from '../lib/ai/embeddings';

const owner=randomUUID(),collection=randomUUID(),document=randomUUID(),conversation=randomUUID();let cookie='';
beforeAll(async()=>{
  await (await database()).query('INSERT INTO users(id,email,display_name,password_hash) VALUES($1,$2,$3,$4)',[owner,`${owner}@test.example`,'Owner','unused']);
  const content='The moonstone archive stores private records with access controls.';
  const provider=new MockEmbeddingProvider(), embedded=await provider.embed([content]);
  await withUser(owner,async tx=>{
    await tx.query('INSERT INTO collections(id,owner_id,name) VALUES($1,$2,$3)',[collection,owner,'Cancellation']);
    await tx.query(`INSERT INTO documents(id,owner_id,collection_id,filename,content_type,file_size,storage_key,checksum,status,progress) VALUES($1,$2,$3,'source.txt','text/plain',80,$4,'checksum','READY',100)`,[document,owner,collection,`${owner}/${document}`]);
    await tx.query(`INSERT INTO document_chunks(id,document_id,collection_id,owner_id,chunk_index,content,token_count,embedding_model,embedding) VALUES($1,$2,$3,$4,0,$5,12,$6,$7::vector)`,[randomUUID(),document,collection,owner,content,provider.model,vectorLiteral(embedded.vectors[0])]);
    await tx.query('INSERT INTO conversations(id,owner_id,collection_id,title) VALUES($1,$2,$3,$4)',[conversation,owner,collection,'Test']);
  });
  cookie=`cv_session=${await createSession(owner)}`;
});

describe('best-effort cancellation',()=>{
  it('does not call an embedding endpoint if the signal is already aborted',async()=>{
    const controller=new AbortController();controller.abort();
    const vector=(await new MockEmbeddingProvider().embed(['text'])).vectors[0];
    const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({data:[{embedding:vector}]}),{status:200,headers:{'Content-Type':'application/json'}}));
    try {
      await expect(new LocalEmbeddingProvider().embed(['text'],controller.signal)).rejects.toMatchObject({name:'AbortError'});
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {fetchMock.mockRestore();}
  });
  it('forwards an in-flight abort to the embedding endpoint',async()=>{
    const controller=new AbortController();let started!:()=>void;let forwarded:AbortSignal|undefined;
    const entered=new Promise<void>(r=>{started=r});
    const fetchMock=vi.spyOn(globalThis,'fetch').mockImplementation(async(_url,init)=>{
      forwarded=init?.signal as AbortSignal;started();
      return new Promise<Response>((_resolve,reject)=>forwarded?.addEventListener('abort',()=>reject(forwarded?.reason),{once:true}));
    });
    try {
      const pending=new LocalEmbeddingProvider().embed(['text'],controller.signal);await entered;controller.abort();
      await expect(pending).rejects.toMatchObject({name:'AbortError'});expect(forwarded?.aborted).toBe(true);
    } finally {fetchMock.mockRestore();}
  });
  it('does not persist an answer even if a provider ignores the abort signal',async()=>{
    const controller=new AbortController();let started!:()=>void,release!:(response:Response)=>void;
    const entered=new Promise<void>(r=>{started=r});
    const fetchMock=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>{started();return new Promise<Response>(resolve=>{release=resolve})});
    process.env.AI_PROVIDER='local';
    try {
      const req=new Request('http://localhost/api/chat',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({conversationId:conversation,question:'What does the moonstone archive store?'}),signal:controller.signal});
      const pending=handle(req,['chat']);await entered;controller.abort();
      release(new Response(JSON.stringify({choices:[{message:{content:'It stores private records [1].'}}]}),{status:200,headers:{'Content-Type':'application/json'}}));
      expect((await pending).status).toBe(499);
      const assistants=await withUser(owner,async tx=>(await tx.query("SELECT id FROM messages WHERE conversation_id=$1 AND owner_id=$2 AND role='ASSISTANT'",[conversation,owner])).rows);
      expect(assistants).toEqual([]);
    } finally {process.env.AI_PROVIDER='mock';fetchMock.mockRestore();}
  });
  it('propagates request abort to an in-flight generation and does not persist its answer',async()=>{
    const controller=new AbortController();let started!:()=>void,release!:(response:Response)=>void;let providerSignal:AbortSignal|undefined;
    const entered=new Promise<void>(r=>{started=r});
    const fetchMock=vi.spyOn(globalThis,'fetch').mockImplementation(async(_url,init)=>{
      providerSignal=init?.signal as AbortSignal;
      started();return new Promise<Response>((resolve,reject)=>{release=resolve;providerSignal?.addEventListener('abort',()=>reject(providerSignal?.reason),{once:true});});
    });
    process.env.AI_PROVIDER='local';
    try {
      const req=new Request('http://localhost/api/chat',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({conversationId:conversation,question:'What does the moonstone archive store?'}),signal:controller.signal});
      const pending=handle(req,['chat']);await entered;controller.abort();const propagated=providerSignal?.aborted;
      release(new Response(JSON.stringify({choices:[{message:{content:'It stores private records [1].'}}]}),{status:200,headers:{'Content-Type':'application/json'}}));
      const response=await pending;expect(propagated).toBe(true);expect(response.status).toBe(499);
      const messages=await withUser(owner,async tx=>(await tx.query('SELECT role FROM messages WHERE conversation_id=$1 AND owner_id=$2',[conversation,owner])).rows);
      expect(messages.length).toBeGreaterThan(0);expect(messages.every(m=>m.role==='USER')).toBe(true);
    } finally {process.env.AI_PROVIDER='mock';fetchMock.mockRestore();}
  });
});
