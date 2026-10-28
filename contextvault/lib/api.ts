import { randomUUID, createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { database, withUser, type Queryable } from './db';
import { COOKIE, cookieValue, createSession, deleteSession, getUser, hashPassword, verifyPassword, rateLimit, sameOrigin, type SessionUser } from './auth';
import { demoEnabled, seedDemo } from './documents/seed';
import { startEmbeddedWorker } from './documents/processor';
import { MAX_FILE_SIZE, validateUpload } from './documents/extract';
import { putObject, deleteObject, getObject } from './storage';
import { runRag } from './rag/pipeline';
import { compareRetrieval, type RetrievedChunk } from './rag/retrieval';
import { embeddingProvider } from './ai/embeddings';
import { llmProvider } from './ai/llm';

class HttpError extends Error { constructor(public status:number, message:string) { super(message); } }
const idSchema=z.string().uuid();
const requireId=(id:string) => { if (!idSchema.safeParse(id).success) throw new HttpError(404,'Not found.'); return id; };
const collectionInput = z.object({ name:z.string().trim().min(1).max(100), description:z.string().trim().max(300).default(''), color:z.enum(['violet','blue','orange','green','pink']).default('violet'), chunkSize:z.number().int().min(300).max(2400).optional(), chunkOverlap:z.number().int().min(0).max(1200).optional() });
const questionInput = z.object({ collectionId:z.string().uuid(), question:z.string().trim().min(1).max(2000), topK:z.number().int().min(1).max(8).default(4), threshold:z.number().min(0).max(1).default(0.08), strategy:z.enum(['hybrid','vector','keyword']).default('hybrid'), rerank:z.boolean().default(false), documentId:z.string().uuid().optional(), documentType:z.string().max(100).optional(), tags:z.array(z.string().max(30)).max(10).optional(), createdAfter:z.iso.date().optional(), createdBefore:z.iso.date().optional(), style:z.string().max(300).optional() });
const parse = <S extends z.ZodTypeAny>(schema:S, value:unknown):z.output<S> => { const result=schema.safeParse(value); if (!result.success) throw new HttpError(400,result.error.issues[0]?.message || 'Invalid request.'); return result.data; };
const json = (data:unknown,status=200) => NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
function setSession(response:NextResponse,token:string) { response.cookies.set(COOKIE,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*30}); response.cookies.delete('cv_skip_demo'); }
async function userFor(request:Request) { const user=await getUser(request); if (!user) throw new HttpError(401,'Please sign in to continue.'); return user; }
async function assertCollection(owner:string,id:string) {
  requireId(id); const row=await withUser(owner,async tx => (await tx.query('SELECT * FROM collections WHERE id=$1 AND owner_id=$2',[id,owner])).rows[0]);
  if (!row) throw new HttpError(404,'Collection not found.'); return row;
}
async function assertDocument(owner:string,id:string) {
  requireId(id); const row=await withUser(owner,async tx => (await tx.query('SELECT * FROM documents WHERE id=$1 AND owner_id=$2',[id,owner])).rows[0]);
  if (!row) throw new HttpError(404,'Document not found.'); return row;
}
async function assertConversation(owner:string,id:string) {
  requireId(id); const row=await withUser(owner,async tx => (await tx.query('SELECT * FROM conversations WHERE id=$1 AND owner_id=$2',[id,owner])).rows[0]);
  if (!row) throw new HttpError(404,'Conversation not found.'); return row;
}
async function audit(owner:string,action:string,id?:string) { await withUser(owner,async tx => { await tx.query('INSERT INTO audit_events(id,owner_id,action,resource_id) VALUES($1,$2,$3,$4)',[randomUUID(),owner,action,id || null]); }); }
async function workspace(user:SessionUser) {
  return withUser(user.id,async tx => {
    const collections=(await tx.query(`SELECT c.*,count(d.id)::int AS document_count,
      count(d.id) FILTER (WHERE d.status='READY' AND NOT d.archived AND EXISTS (SELECT 1 FROM document_chunks ch WHERE ch.document_id=d.id AND ch.owner_id=d.owner_id AND ch.embedding_model=$2))::int AS ready_count
      FROM collections c LEFT JOIN documents d ON d.collection_id=c.id AND d.owner_id=c.owner_id
      WHERE c.owner_id=$1 GROUP BY c.id ORDER BY c.created_at`,[user.id,embeddingProvider().model])).rows;
    const documents=(await tx.query(`SELECT d.id,d.collection_id,d.filename,d.content_type,d.file_size,d.page_count,d.status,d.progress,d.error,d.tags,d.archived,d.timings,d.created_at,d.updated_at,c.name AS collection_name,c.color AS collection_color,
      (SELECT count(*)::int FROM document_chunks ch WHERE ch.document_id=d.id AND ch.owner_id=d.owner_id) AS chunk_count,
      (SELECT ch.embedding_model FROM document_chunks ch WHERE ch.document_id=d.id AND ch.owner_id=d.owner_id LIMIT 1) AS embedding_model
      FROM documents d JOIN collections c ON c.id=d.collection_id AND c.owner_id=d.owner_id WHERE d.owner_id=$1 ORDER BY d.created_at DESC`,[user.id])).rows;
    const conversations=(await tx.query(`SELECT cv.*,c.name AS collection_name,c.color AS collection_color FROM conversations cv JOIN collections c ON c.id=cv.collection_id AND c.owner_id=cv.owner_id WHERE cv.owner_id=$1 ORDER BY cv.updated_at DESC LIMIT 100`,[user.id])).rows;
    const stats=(await tx.query(`SELECT (SELECT count(*)::int FROM document_chunks ch JOIN documents d ON d.id=ch.document_id AND d.owner_id=ch.owner_id WHERE ch.owner_id=$1 AND ch.embedding_model=$2 AND d.status='READY' AND NOT d.archived) AS chunks,
      (SELECT count(*)::int FROM retrieval_events WHERE owner_id=$1) AS queries`,[user.id,embeddingProvider().model])).rows[0];
    return {user,collections,documents,conversations,stats,config:{demo:demoEnabled() && user.email==='alex@contextvault.demo', aiProvider:llmProvider().model, embeddingProvider:embeddingProvider().model,
      externalAI:['openai','local'].includes(process.env.AI_PROVIDER||'') || ['openai','local'].includes(process.env.EMBEDDING_PROVIDER||''), storage:process.env.STORAGE_PROVIDER==='s3'?'S3-compatible':'local', embedded:!process.env.DATABASE_URL}};
  });
}
async function conversationData(owner:string,id:string) {
  const conversation=await assertConversation(owner,id);
  return withUser(owner,async tx => {
    const messages=(await tx.query('SELECT * FROM messages WHERE owner_id=$1 AND conversation_id=$2 ORDER BY created_at,id',[owner,id])).rows;
    for (const message of messages) {
      if (message.role !== 'ASSISTANT') continue;
      message.citations=(await tx.query(`SELECT ci.citation_index,ci.similarity,ch.id AS chunk_id,ch.content,ch.page_number,ch.section_title,ch.chunk_index,d.id AS document_id,d.filename,d.content_type
        FROM citations ci LEFT JOIN document_chunks ch ON ch.id=ci.chunk_id AND ch.owner_id=ci.owner_id AND ch.collection_id=$3
          AND EXISTS (SELECT 1 FROM documents valid WHERE valid.id=ch.document_id AND valid.owner_id=ch.owner_id AND valid.collection_id=$3 AND valid.status='READY' AND NOT valid.archived)
        LEFT JOIN documents d ON d.id=ch.document_id AND d.owner_id=ci.owner_id
        WHERE ci.message_id=$1 AND ci.owner_id=$2 ORDER BY ci.citation_index`,[message.id,owner,conversation.collection_id])).rows;
      const event=(await tx.query('SELECT * FROM retrieval_events WHERE message_id=$1 AND owner_id=$2 AND collection_id=$3 ORDER BY created_at DESC LIMIT 1',[message.id,owner,conversation.collection_id])).rows[0];
      if (event) {
        const results=event.metadata?.results || [];
        const chunks=[];
        for (const item of results) {
          const c=(await tx.query(`SELECT ch.id,ch.content,ch.page_number,ch.section_title,ch.chunk_index,d.id AS document_id,d.filename,d.content_type
            FROM document_chunks ch JOIN documents d ON d.id=ch.document_id AND d.owner_id=ch.owner_id
            WHERE ch.id=$1 AND ch.owner_id=$2 AND ch.collection_id=$3 AND d.collection_id=$3 AND d.status='READY' AND NOT d.archived`,[item.id,owner,conversation.collection_id])).rows[0];
          if (c) chunks.push({...c,similarity:item.similarity,lexical_score:item.lexical_score,rank_score:item.rank_score});
        }
        message.retrieval={strategy:event.strategy,durationMs:event.duration_ms,chunks};
      }
    }
    return {conversation,messages};
  });
}
/** Lock and recheck every retrieved passage before returning or saving it. */
async function assertCurrentSources(tx:Queryable, owner:string, collectionId:string, snapshots:RetrievedChunk[]) {
  if (!snapshots.length) return;
  const docIds=[...new Set(snapshots.map(c=>c.document_id))];
  const chunkIds=[...new Set(snapshots.map(c=>c.id))];
  const docs=(await tx.query(`SELECT id FROM documents WHERE id=ANY($1::uuid[]) AND owner_id=$2 AND collection_id=$3 AND status='READY' AND NOT archived FOR SHARE`,[docIds,owner,collectionId])).rows;
  const chunks=(await tx.query(`SELECT id,document_id,content FROM document_chunks WHERE id=ANY($1::uuid[]) AND owner_id=$2 AND collection_id=$3 FOR SHARE`,[chunkIds,owner,collectionId])).rows;
  const currentById=new Map(chunks.map(c=>[c.id,c]));
  if (docs.length!==docIds.length || chunks.length!==chunkIds.length || snapshots.some(c=>currentById.get(c.id)?.content!==c.content || currentById.get(c.id)?.document_id!==c.document_id)) throw new HttpError(409,'Sources changed while the request was running. Please try again.');
}
function optionsFrom(input:z.infer<typeof questionInput>) { return {topK:input.topK,threshold:input.threshold,strategy:input.strategy,rerank:input.rerank,documentId:input.documentId,documentType:input.documentType,tags:input.tags,createdAfter:input.createdAfter,createdBefore:input.createdBefore,style:input.style}; }

export async function handle(request:Request, path:string[]) {
  try {
    const method=request.method; const [first,second,third]=path;
    if (method!=='GET') sameOrigin(request);
    if (method==='GET' && first==='bootstrap') {
      let user=await getUser(request), token:string|undefined;
      if (!user && demoEnabled() && !cookieValue(request,'cv_skip_demo')) {
        const id=await seedDemo(); token=await createSession(id); user=(await (await database()).query<SessionUser>('SELECT id,email,display_name,role FROM users WHERE id=$1',[id])).rows[0];
      }
      startEmbeddedWorker();
      const response=json(user ? await workspace(user) : {user:null,config:{demoAvailable:demoEnabled()}});
      if (token) setSession(response,token); return response;
    }
    if (first==='auth' && method==='POST') {
      await rateLimit(request,`auth:${second}`,12);
      if (second==='logout') { await deleteSession(request); const response=json({ok:true}); response.cookies.delete(COOKIE); response.cookies.set('cv_skip_demo','1',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*30}); return response; }
      if (second==='demo' && demoEnabled()) { const id=await seedDemo(); const response=json({ok:true}); setSession(response,await createSession(id)); return response; }
      const body=await request.json();
      if (second==='register') {
        const data=parse(z.object({email:z.string().trim().email().max(254),password:z.string().min(10).max(128),name:z.string().trim().min(1).max(80)}),body);
        const id=randomUUID();
        try { await (await database()).query('INSERT INTO users(id,email,display_name,password_hash) VALUES($1,$2,$3,$4)',[id,data.email.toLowerCase(),data.name,await hashPassword(data.password)]); }
        catch (error) { if ((error as {code?:string}).code==='23505') throw new HttpError(409,'That email is already registered.'); throw error; }
        const response=json({ok:true},201); setSession(response,await createSession(id)); return response;
      }
      if (second==='login') {
        const data=parse(z.object({email:z.string().trim().email().max(254),password:z.string().max(128)}),body);
        const row=(await (await database()).query('SELECT * FROM users WHERE email=$1',[data.email.toLowerCase()])).rows[0];
        const valid = await verifyPassword(data.password,row?.password_hash || `${'0'.repeat(32)}:${'0'.repeat(128)}`);
        if (!row || !valid) throw new HttpError(401,'Email or password is incorrect.');
        const response=json({ok:true}); setSession(response,await createSession(row.id)); return response;
      }
      throw new HttpError(404,'Not found.');
    }
    const user=await userFor(request), owner=user.id;
    if (method==='GET' && first==='conversations' && second) return json(await conversationData(owner,second));
    if (method==='GET' && first==='documents' && second && third==='file') {
      const doc=await assertDocument(owner,second); const bytes=await getObject(doc.storage_key);
      return new Response(Buffer.from(bytes),{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}});
    }
    if (method==='GET' && first==='usage') return json(await withUser(owner,async tx => (await tx.query(`SELECT kind,model,count(*)::int AS requests,sum(input_tokens)::int AS input_tokens,sum(output_tokens)::int AS output_tokens,avg(latency_ms)::int AS avg_latency_ms FROM usage_events WHERE owner_id=$1 GROUP BY kind,model ORDER BY kind`,[owner])).rows));
    if (method==='POST' && first==='profile') {
      const data=parse(z.object({name:z.string().trim().min(1).max(80)}),await request.json());
      await (await database()).query('UPDATE users SET display_name=$1 WHERE id=$2',[data.name,owner]); return json({ok:true});
    }
    if (method==='POST' && first==='collections' && !second) {
      const data=parse(collectionInput,await request.json()); if ((data.chunkOverlap ?? 120) >= (data.chunkSize ?? 900)) throw new HttpError(400,'Overlap must be smaller than chunk size.');
      const id=randomUUID();
      try { await withUser(owner,async tx => { await tx.query('INSERT INTO collections(id,owner_id,name,description,color,chunk_size,chunk_overlap) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,owner,data.name,data.description,data.color,data.chunkSize??900,data.chunkOverlap??120]); }); }
      catch (error) { if ((error as {code?:string}).code==='23505') throw new HttpError(409,'A collection with that name already exists.'); throw error; }
      await audit(owner,'collection.created',id); return json({id},201);
    }
    if (method==='PATCH' && first==='collections' && second) {
      await assertCollection(owner,second); const data=parse(collectionInput,await request.json());
      if ((data.chunkOverlap??120)>=(data.chunkSize??900)) throw new HttpError(400,'Overlap must be smaller than chunk size.');
      await withUser(owner,async tx => { await tx.query('UPDATE collections SET name=$1,description=$2,color=$3,chunk_size=$4,chunk_overlap=$5,updated_at=now() WHERE id=$6 AND owner_id=$7',[data.name,data.description,data.color,data.chunkSize??900,data.chunkOverlap??120,second,owner]); }); return json({ok:true});
    }
    if (method==='DELETE' && first==='collections' && second) {
      await assertCollection(owner,second);
      await withUser(owner,async tx => {
        const docs=(await tx.query('SELECT storage_key FROM documents WHERE collection_id=$1 AND owner_id=$2',[second,owner])).rows;
        for (const doc of docs) await tx.query('INSERT INTO storage_deletions(id,owner_id,storage_key) VALUES($1,$2,$3)',[randomUUID(),owner,doc.storage_key]);
        await tx.query('DELETE FROM collections WHERE id=$1 AND owner_id=$2',[second,owner]);
      });
      startEmbeddedWorker(); await audit(owner,'collection.deleted',second); return json({ok:true});
    }
    if (method==='POST' && first==='documents' && !second) {
      await rateLimit(request,'upload',20);
      if (Number(request.headers.get('content-length')||0)>MAX_FILE_SIZE+1024*1024) throw new HttpError(413,'File exceeds the 10 MB limit.');
      const form=await request.formData(); const file=form.get('file'); const collectionId=String(form.get('collectionId')||'');
      if (!(file instanceof File)) throw new HttpError(400,'Choose a file to upload.');
      if (file.size>MAX_FILE_SIZE || file.size===0) throw new HttpError(400,'File must be between 1 byte and 10 MB.');
      await assertCollection(owner,collectionId); const bytes=new Uint8Array(await file.arrayBuffer());
      const valid=validateUpload(file.name,file.type,bytes); const id=randomUUID(),key=`${owner}/${id}`;
      await putObject(key,bytes,valid.contentType);
      try { await withUser(owner,async tx => {
        await tx.query(`INSERT INTO documents(id,owner_id,collection_id,filename,content_type,file_size,storage_key,checksum) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[id,owner,collectionId,valid.filename,valid.contentType,bytes.length,key,createHash('sha256').update(bytes).digest('hex')]);
        await tx.query('INSERT INTO ingestion_jobs(id,owner_id,document_id) VALUES($1,$2,$3)',[randomUUID(),owner,id]);
      }); } catch(error) { await deleteObject(key); throw error; }
      startEmbeddedWorker(); await audit(owner,'document.uploaded',id); return json({id,status:'UPLOADED'},202);
    }
    if (method==='POST' && first==='documents' && second && third==='retry') {
      await assertDocument(owner,second);
      await withUser(owner,async tx => {
        const active=(await tx.query("SELECT id FROM ingestion_jobs WHERE document_id=$1 AND owner_id=$2 AND status IN ('QUEUED','PROCESSING')",[second,owner])).rows[0];
        if (active) throw new HttpError(409,'This document is already processing.');
        await tx.query("UPDATE documents SET status='UPLOADED',progress=0,error=NULL,updated_at=now() WHERE id=$1 AND owner_id=$2",[second,owner]);
        await tx.query('INSERT INTO ingestion_jobs(id,owner_id,document_id) VALUES($1,$2,$3)',[randomUUID(),owner,second]);
      }); startEmbeddedWorker(); return json({ok:true},202);
    }
    if (method==='PATCH' && first==='documents' && second) {
      const doc=await assertDocument(owner,second);
      const data=parse(z.object({filename:z.string().trim().min(1).max(180).optional(),collectionId:z.string().uuid().optional(),tags:z.array(z.string().trim().min(1).max(30)).max(10).optional(),archived:z.boolean().optional()}),await request.json());
      if (data.collectionId) await assertCollection(owner,data.collectionId);
      if (data.filename && (/[\\/\x00-\x1f]/.test(data.filename) || data.filename.startsWith('.') || data.filename.split('.').pop()?.toLowerCase()!==doc.filename.split('.').pop()?.toLowerCase())) throw new HttpError(400,'Keep the original file extension and avoid folder names.');
      await withUser(owner,async tx => { await tx.query('UPDATE documents SET filename=$1,collection_id=$2,tags=$3,archived=$4,updated_at=now() WHERE id=$5 AND owner_id=$6',[data.filename??doc.filename,data.collectionId??doc.collection_id,data.tags??doc.tags,data.archived??doc.archived,second,owner]); });
      await audit(owner,'document.updated',second); return json({ok:true});
    }
    if (method==='DELETE' && first==='documents' && second) {
      const doc=await assertDocument(owner,second); await withUser(owner,async tx => {
        await tx.query('INSERT INTO storage_deletions(id,owner_id,storage_key) VALUES($1,$2,$3)',[randomUUID(),owner,doc.storage_key]);
        await tx.query('DELETE FROM documents WHERE id=$1 AND owner_id=$2',[second,owner]);
      });
      startEmbeddedWorker(); await audit(owner,'document.deleted',second); return json({ok:true});
    }
    if (method==='POST' && first==='conversations' && !second) {
      const data=parse(z.object({collectionId:z.string().uuid(),title:z.string().trim().min(1).max(120).default('New conversation')}),await request.json()); await assertCollection(owner,data.collectionId);
      const id=randomUUID(); await withUser(owner,async tx => { await tx.query('INSERT INTO conversations(id,owner_id,collection_id,title) VALUES($1,$2,$3,$4)',[id,owner,data.collectionId,data.title]); }); return json({id},201);
    }
    if (method==='PATCH' && first==='conversations' && second) {
      await assertConversation(owner,second); const data=parse(z.object({title:z.string().trim().min(1).max(120)}),await request.json());
      await withUser(owner,async tx => { await tx.query('UPDATE conversations SET title=$1,updated_at=now() WHERE id=$2 AND owner_id=$3',[data.title,second,owner]); }); return json({ok:true});
    }
    if (method==='DELETE' && first==='conversations' && second) {
      await assertConversation(owner,second); await withUser(owner,async tx => { await tx.query('DELETE FROM conversations WHERE id=$1 AND owner_id=$2',[second,owner]); }); return json({ok:true});
    }
    if (method==='POST' && first==='chat') {
      await rateLimit(request,`chat:${owner}`,30);
      const data=parse(z.object({conversationId:z.string().uuid(),question:z.string().trim().min(1).max(2000),mode:z.enum(['new','retry','regenerate']).default('new')}),await request.json());
      const conversation=await assertConversation(owner,data.conversationId);
      const recent=await withUser(owner,async tx => (await tx.query("SELECT id,role,content FROM messages WHERE conversation_id=$1 AND owner_id=$2 AND role IN ('USER','ASSISTANT') ORDER BY created_at DESC,id DESC LIMIT 6",[data.conversationId,owner])).rows);
      let replaceId:string | null=null; let historyRows=recent;
      if (data.mode==='regenerate') {
        if (recent[0]?.role!=='ASSISTANT' || recent[1]?.role!=='USER' || recent[1]?.content!==data.question) throw new HttpError(409,'Only the latest answer can be regenerated.');
        replaceId=recent[0].id; historyRows=recent.slice(2);
      } else if (data.mode==='retry') {
        if (recent[0]?.role!=='USER' || recent[0]?.content!==data.question) throw new HttpError(409,'Only the latest unanswered question can be retried.');
        historyRows=recent.slice(1);
      } else {
        request.signal.throwIfAborted();
        await withUser(owner,async tx => { await tx.query("INSERT INTO messages(id,owner_id,conversation_id,role,content) VALUES($1,$2,$3,'USER',$4)",[randomUUID(),owner,data.conversationId,data.question]); });
      }
      // Only prior user questions are used for reference resolution. Old model
      // answers may contain excerpts whose sources were later moved or removed.
      const history=historyRows.slice(0,4).filter(m=>m.role==='USER').reverse() as {role:string;content:string}[];
      const result=await runRag(owner,conversation.collection_id,data.question,history,{signal:request.signal});
      request.signal.throwIfAborted();
      const messageId=randomUUID();
      await withUser(owner,async tx => {
        request.signal.throwIfAborted();
        // Evidence can change while the provider is responding.
        await assertCurrentSources(tx,owner,conversation.collection_id,result.chunks);
        if (replaceId) {
          const latest=(await tx.query("SELECT id FROM messages WHERE conversation_id=$1 AND owner_id=$2 ORDER BY created_at DESC,id DESC LIMIT 1",[data.conversationId,owner])).rows[0];
          if (latest?.id!==replaceId) throw new HttpError(409,'Conversation changed while generating. Please try again.');
          await tx.query('DELETE FROM messages WHERE id=$1 AND owner_id=$2',[replaceId,owner]);
        }
        await tx.query(`INSERT INTO messages(id,owner_id,conversation_id,role,content,model,token_usage,metadata) VALUES($1,$2,$3,'ASSISTANT',$4,$5,$6::jsonb,$7::jsonb)`,[messageId,owner,data.conversationId,result.answer,result.model,JSON.stringify(result.usage),JSON.stringify({promptVersion:result.promptVersion,embeddingModel:result.embeddingModel,timings:result.timings})]);
        for (const [index,num] of result.used.entries()) { const c=result.chunks[num-1]; if (c) await tx.query('INSERT INTO citations(id,owner_id,message_id,chunk_id,citation_index,similarity) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),owner,messageId,c.id,index+1,c.similarity]); }
        await tx.query('INSERT INTO retrieval_events(id,owner_id,message_id,collection_id,strategy,result_count,duration_ms,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)',[randomUUID(),owner,messageId,conversation.collection_id,result.strategy,result.chunks.length,result.timings.retrievalMs,JSON.stringify({results:result.chunks.map(c=>({id:c.id,similarity:c.similarity,lexical_score:c.lexical_score,rank_score:c.rank_score}))})]);
        await tx.query("UPDATE conversations SET title=CASE WHEN title='New conversation' THEN $1 ELSE title END,updated_at=now() WHERE id=$2 AND owner_id=$3",[data.question.slice(0,80),data.conversationId,owner]);
        request.signal.throwIfAborted();
      });
      return json(await conversationData(owner,data.conversationId));
    }
    if (method==='POST' && first==='retrieval' && second==='compare') {
      if (user.role!=='developer') throw new HttpError(403,'Developer access is required.');
      await rateLimit(request,`retrieval-compare:${owner}`,20);
      const data=parse(questionInput,await request.json());
      await assertCollection(owner,data.collectionId);
      const result=await compareRetrieval(owner,data.collectionId,data.question,{...optionsFrom(data),signal:request.signal});
      await withUser(owner,async tx=>{request.signal.throwIfAborted();await assertCurrentSources(tx,owner,data.collectionId,result.results.flatMap(r=>r.chunks));request.signal.throwIfAborted();});
      return json(result);
    }
    if (method==='POST' && (first==='playground' || first==='evaluation')) {
      if (user.role!=='developer') throw new HttpError(403,'Developer access is required.');
      await rateLimit(request,`${first}:${owner}`,20); const raw=await request.json(); const data=parse(questionInput,raw);
      await assertCollection(owner,data.collectionId);
      const result=await runRag(owner,data.collectionId,data.question,[],{...optionsFrom(data),signal:request.signal});
      await withUser(owner,async tx=>{request.signal.throwIfAborted();await assertCurrentSources(tx,owner,data.collectionId,result.chunks);request.signal.throwIfAborted();});
      if (first==='evaluation') {
        const expected=raw.expectedDocumentId ? requireId(raw.expectedDocumentId) : null;
        if (expected) { const doc=await assertDocument(owner,expected); if (doc.collection_id!==data.collectionId) throw new HttpError(400,'Expected document must belong to the selected collection.'); }
        const hits=expected ? result.chunks.filter(c=>c.document_id===expected).length : 0;
        const metrics={precision:expected && result.chunks.length ? hits/result.chunks.length : null,recall:expected ? (hits?1:0) : null,
          citationCorrectness:result.used.length ? result.used.every(n=>!!result.chunks[n-1]) : null,
          expectedPhraseFound:raw.expectedAnswer ? result.answer.toLowerCase().includes(String(raw.expectedAnswer).slice(0,300).toLowerCase()) : null,
          faithfulness:null,completeness:null};
        await withUser(owner,async tx => { await tx.query('INSERT INTO evaluation_runs(id,owner_id,collection_id,question,expected_document_id,result) VALUES($1,$2,$3,$4,$5,$6::jsonb)',[randomUUID(),owner,data.collectionId,data.question,expected,JSON.stringify({metrics,timings:result.timings,model:result.model})]); });
        return json({...result,metrics});
      }
      return json(result);
    }
    throw new HttpError(404,'Not found.');
  } catch (error) {
    if (request.signal.aborted) return json({error:'Request cancelled.'},499);
    if (error instanceof HttpError) return json({error:error.message},error.status);
    const message=error instanceof Error ? error.message : '';
    const known=['Invalid request origin.','Too many requests.','File must be','File type','The PDF','The DOCX','Text files','Supported files','Choose a valid filename','Embedding provider','AI provider','No readable text'];
    const safe=known.some(x=>message.startsWith(x));
    if (!safe) console.error(JSON.stringify({event:'api.error',type:error instanceof Error ? error.name : 'unknown'}));
    return json({error:safe?message:'Something went wrong. Please try again.'},message.startsWith('Too many')?429:message.startsWith('Invalid request origin')?403:safe?400:500);
  }
}
