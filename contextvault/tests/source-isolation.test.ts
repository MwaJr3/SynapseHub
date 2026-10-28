import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { database, withUser } from '../lib/db';
import { createSession } from '../lib/auth';
import { handle } from '../lib/api';
import { MockEmbeddingProvider, vectorLiteral } from '../lib/ai/embeddings';

async function fixture() {
  const owner=randomUUID(), sourceCollection=randomUUID(), targetCollection=randomUUID(), document=randomUUID(), chunk=randomUUID(), conversation=randomUUID();
  const content='The heliolite archive protects sensitive records with strict access controls.';
  await (await database()).query('INSERT INTO users(id,email,display_name,password_hash) VALUES($1,$2,$3,$4)',[owner,`${owner}@test.example`,'Owner','unused']);
  const provider=new MockEmbeddingProvider();const {vectors}=await provider.embed([content]);
  await withUser(owner,async tx=>{
    await tx.query('INSERT INTO collections(id,owner_id,name) VALUES($1,$2,$3),($4,$2,$5)',[sourceCollection,owner,'Source',targetCollection,'Target']);
    await tx.query(`INSERT INTO documents(id,owner_id,collection_id,filename,content_type,file_size,storage_key,checksum,status,progress) VALUES($1,$2,$3,'source.txt','text/plain',80,$4,'checksum','READY',100)`,[document,owner,sourceCollection,`${owner}/${document}`]);
    await tx.query(`INSERT INTO document_chunks(id,document_id,collection_id,owner_id,chunk_index,content,token_count,embedding_model,embedding) VALUES($1,$2,$3,$4,0,$5,12,$6,$7::vector)`,[chunk,document,sourceCollection,owner,content,provider.model,vectorLiteral(vectors[0])]);
    await tx.query('INSERT INTO conversations(id,owner_id,collection_id,title) VALUES($1,$2,$3,$4)',[conversation,owner,sourceCollection,'Test']);
  });
  const cookie=`cv_session=${await createSession(owner)}`;
  const api=(method:string,path:string,body?:unknown)=>handle(new Request(`http://localhost/api/${path}`,{method,headers:{cookie,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),path.split('/'));
  return {owner,sourceCollection,targetCollection,document,chunk,conversation,content,api};
}

describe('historical evidence scope',()=>{
  it('does not resolve moved or archived source previews outside the conversation scope',async()=>{
    const f=await fixture(), message=randomUUID();
    await withUser(f.owner,async tx=>{
      await tx.query("INSERT INTO messages(id,owner_id,conversation_id,role,content) VALUES($1,$2,$3,'ASSISTANT','Answer [1]')",[message,f.owner,f.conversation]);
      await tx.query('INSERT INTO citations(id,owner_id,message_id,chunk_id,citation_index) VALUES($1,$2,$3,$4,1)',[randomUUID(),f.owner,message,f.chunk]);
      await tx.query('INSERT INTO retrieval_events(id,owner_id,message_id,collection_id,strategy,result_count,duration_ms,metadata) VALUES($1,$2,$3,$4,$5,1,1,$6::jsonb)',[randomUUID(),f.owner,message,f.sourceCollection,'hybrid',JSON.stringify({results:[{id:f.chunk,similarity:0.5}]})]);
    });
    const read=async()=>((await (await f.api('GET',`conversations/${f.conversation}`)).json()).messages[0]);
    expect((await read()).citations[0].content).toBe(f.content);
    expect((await f.api('PATCH',`documents/${f.document}`,{collectionId:f.targetCollection})).status).toBe(200);
    let messageData=await read();
    expect(messageData.citations[0].content).toBeNull();expect(messageData.citations[0].filename).toBeNull();expect(messageData.retrieval.chunks).toEqual([]);
    expect((await f.api('PATCH',`documents/${f.document}`,{collectionId:f.sourceCollection,archived:true})).status).toBe(200);
    messageData=await read();
    expect(messageData.citations[0].content).toBeNull();expect(messageData.retrieval.chunks).toEqual([]);
  });
  it('rechecks and resolves evidence under a non-bypass RLS runtime role',async()=>{
    const f=await fixture(),db=await database();
    await db.exec('CREATE ROLE cv_source_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS; GRANT USAGE ON SCHEMA public TO cv_source_runtime; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO cv_source_runtime;');
    await db.exec('SET ROLE cv_source_runtime');
    try {
      const response=await f.api('POST','chat',{conversationId:f.conversation,question:'What does the heliolite archive protect?'});
      expect(response.status).toBe(200);const answer=(await response.json()).messages.find((m:any)=>m.role==='ASSISTANT');
      expect(answer.citations[0].content).toBe(f.content);
      expect((await f.api('PATCH',`documents/${f.document}`,{collectionId:f.targetCollection})).status).toBe(200);
      const history=await (await f.api('GET',`conversations/${f.conversation}`)).json();
      expect(history.messages.find((m:any)=>m.role==='ASSISTANT').citations[0].content).toBeNull();
    } finally {await db.exec('RESET ROLE');}
  });
  it.each([false,true])('never forwards prior assistant text into a fresh prompt (moved=%s)',async(moved)=>{
    const f=await fixture(), oldUser=randomUUID(), oldAnswer=randomUUID(), freshDocument=randomUUID(), freshChunk=randomUUID();
    const fresh='The coraltransit research archive records monthly results for volunteers.';
    const provider=new MockEmbeddingProvider(), vector=(await provider.embed([fresh])).vectors[0];
    await withUser(f.owner,async tx=>{
      await tx.query("INSERT INTO messages(id,owner_id,conversation_id,role,content,created_at) VALUES($1,$2,$3,'USER','Earlier question',now()-interval '2 minutes')",[oldUser,f.owner,f.conversation]);
      await tx.query("INSERT INTO messages(id,owner_id,conversation_id,role,content,created_at) VALUES($1,$2,$3,'ASSISTANT','PRIOR_SECRET_EXCERPT [1]',now()-interval '1 minute')",[oldAnswer,f.owner,f.conversation]);
      await tx.query('INSERT INTO citations(id,owner_id,message_id,chunk_id,citation_index) VALUES($1,$2,$3,$4,1)',[randomUUID(),f.owner,oldAnswer,f.chunk]);
      await tx.query(`INSERT INTO documents(id,owner_id,collection_id,filename,content_type,file_size,storage_key,checksum,status,progress) VALUES($1,$2,$3,'fresh.txt','text/plain',80,$4,'checksum','READY',100)`,[freshDocument,f.owner,f.sourceCollection,`${f.owner}/${freshDocument}`]);
      await tx.query(`INSERT INTO document_chunks(id,document_id,collection_id,owner_id,chunk_index,content,token_count,embedding_model,embedding) VALUES($1,$2,$3,$4,0,$5,12,$6,$7::vector)`,[freshChunk,freshDocument,f.sourceCollection,f.owner,fresh,provider.model,vectorLiteral(vector)]);
    });
    if(moved) expect((await f.api('PATCH',`documents/${f.document}`,{collectionId:f.targetCollection})).status).toBe(200);
    let prompt='';const fetchMock=vi.spyOn(globalThis,'fetch').mockImplementation(async(_url,init)=>{
      prompt=JSON.parse(String(init?.body)).messages[1].content;
      return new Response(JSON.stringify({choices:[{message:{content:'A new answer [1].'}}]}),{status:200,headers:{'Content-Type':'application/json'}});
    });
    process.env.AI_PROVIDER='local';
    try {
      expect((await f.api('POST','chat',{conversationId:f.conversation,question:'What does coraltransit record?'})).status).toBe(200);
      expect(prompt).toContain('coraltransit');
      expect(prompt).not.toContain('PRIOR_SECRET_EXCERPT');expect(prompt).toContain('Earlier question');
    } finally {process.env.AI_PROVIDER='mock';fetchMock.mockRestore();}
  });
  it('refuses playground output if its evidence moves while generation is in flight',async()=>{
    const f=await fixture();await (await database()).query("UPDATE users SET role='developer' WHERE id=$1",[f.owner]);
    let signalStarted!:()=>void,release!:(value:Response)=>void;
    const started=new Promise<void>(resolve=>{signalStarted=resolve}),pending=new Promise<Response>(resolve=>{release=resolve});
    const fetchMock=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>{signalStarted();return pending});
    process.env.AI_PROVIDER='local';
    try {
      const response=f.api('POST','playground',{collectionId:f.sourceCollection,question:'What does the heliolite archive protect?'});
      await started;expect((await f.api('PATCH',`documents/${f.document}`,{collectionId:f.targetCollection})).status).toBe(200);
      release(new Response(JSON.stringify({choices:[{message:{content:'It protects sensitive records [1].'}}]}),{status:200,headers:{'Content-Type':'application/json'}}));
      const result=await response;expect(result.status).toBe(409);expect((await result.json()).error).toMatch(/sources changed/i);
    } finally {process.env.AI_PROVIDER='mock';fetchMock.mockRestore();}
  });
  it('refuses a comparison snapshot if a source moves between strategy searches',async()=>{
    const f=await fixture();await (await database()).query("UPDATE users SET role='developer' WHERE id=$1",[f.owner]);
    let signalStarted!:()=>void,release!:(value:Response)=>void;
    const started=new Promise<void>(resolve=>{signalStarted=resolve}),pending=new Promise<Response>(resolve=>{release=resolve});
    const fetchMock=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>{signalStarted();return pending});
    const vector=(await new MockEmbeddingProvider().embed(['heliolite'])).vectors[0];
    process.env.EMBEDDING_PROVIDER='local';
    try {
      const response=f.api('POST','retrieval/compare',{collectionId:f.sourceCollection,question:'heliolite'});
      await started;
      // Keyword search finishes before the shared embedding request starts.
      expect((await f.api('PATCH',`documents/${f.document}`,{collectionId:f.targetCollection})).status).toBe(200);
      release(new Response(JSON.stringify({data:[{embedding:vector}]}),{status:200,headers:{'Content-Type':'application/json'}}));
      const result=await response;expect(result.status).toBe(409);expect((await result.json()).error).toMatch(/sources changed/i);
    } finally {process.env.EMBEDDING_PROVIDER='mock';fetchMock.mockRestore();}
  });
  it.each(['archive','delete','change content'])('rejects an in-flight answer when evidence is subject to %s',async(change)=>{
    const f=await fixture();let started!:()=>void,release!:(value:Response)=>void;
    const entered=new Promise<void>(r=>{started=r}),pending=new Promise<Response>(r=>{release=r});
    const fetchMock=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>{started();return pending});
    process.env.AI_PROVIDER='local';
    try {
      const response=f.api('POST','chat',{conversationId:f.conversation,question:'What does the heliolite archive protect?'});
      await entered;
      if(change==='archive') expect((await f.api('PATCH',`documents/${f.document}`,{archived:true})).status).toBe(200);
      if(change==='delete') expect((await f.api('DELETE',`documents/${f.document}`)).status).toBe(200);
      if(change==='change content') await withUser(f.owner,async tx=>{await tx.query("UPDATE document_chunks SET content='Changed evidence.' WHERE id=$1 AND owner_id=$2",[f.chunk,f.owner])});
      release(new Response(JSON.stringify({choices:[{message:{content:'It protects records [1].'}}]}),{status:200,headers:{'Content-Type':'application/json'}}));
      expect((await response).status).toBe(409);
    } finally {process.env.AI_PROVIDER='mock';fetchMock.mockRestore();}
  });
  it('refuses to persist an answer if its evidence moves while generation is in flight',async()=>{
    const f=await fixture();let signalStarted!:()=>void;let release!:(value:Response)=>void;
    const started=new Promise<void>(resolve=>{signalStarted=resolve});
    const pending=new Promise<Response>(resolve=>{release=resolve});
    const fetchMock=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>{signalStarted();return pending});
    process.env.AI_PROVIDER='local';
    try {
      const response=f.api('POST','chat',{conversationId:f.conversation,question:'What does the heliolite archive protect?'});
      await started;
      expect((await f.api('PATCH',`documents/${f.document}`,{collectionId:f.targetCollection})).status).toBe(200);
      release(new Response(JSON.stringify({choices:[{message:{content:'It protects sensitive records [1].'}}]}),{status:200,headers:{'Content-Type':'application/json'}}));
      const result=await response;expect(result.status).toBe(409);expect((await result.json()).error).toMatch(/sources changed/i);
      const messages=await withUser(f.owner,async tx=>(await tx.query('SELECT role FROM messages WHERE conversation_id=$1 AND owner_id=$2',[f.conversation,f.owner])).rows);
      expect(messages.map(m=>m.role)).toEqual(['USER']);
    } finally {process.env.AI_PROVIDER='mock';fetchMock.mockRestore();}
  });
});
