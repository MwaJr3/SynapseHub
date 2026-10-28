import { randomUUID, createHash } from 'node:crypto';
import { withUser, type Queryable } from '../db';
import { getObject, deleteObject } from '../storage';
import { validateUpload, extractDocument } from './extract';
import { chunkSegments } from './chunking';
import { embeddingProvider, vectorLiteral } from '../ai/embeddings';

const SAFE_ERRORS = ['File must be','File type','The PDF','The DOCX','Text files','DOCX archive','DOCX is missing','Could not read','PDF exceeds','No readable text','Embedding provider','Document integrity','Unsupported document'];
function safeError(error:unknown) {
  const msg = error instanceof Error ? error.message : '';
  return SAFE_ERRORS.some(prefix => msg.startsWith(prefix)) ? msg.slice(0,220) : 'Processing failed. Please check the file and try again.';
}
type Lease = { id:string; attempt:number };
class LeaseLost extends Error {}
async function assertLease(tx:Queryable, ownerId:string, documentId:string, lease?:Lease) {
  if (!lease) return; // Direct seeding runs synchronously, without a queued job.
  const rows=(await tx.query("SELECT id FROM ingestion_jobs WHERE id=$1 AND owner_id=$2 AND document_id=$3 AND status='PROCESSING' AND attempts=$4 FOR UPDATE",[lease.id,ownerId,documentId,lease.attempt])).rows;
  if (!rows.length) throw new LeaseLost('Ingestion lease is no longer current.');
}
export async function processDocument(ownerId:string, documentId:string, lease?:Lease) {
  const doc = await withUser(ownerId, async tx => (await tx.query(`SELECT d.*,c.chunk_size,c.chunk_overlap FROM documents d JOIN collections c ON c.id=d.collection_id AND c.owner_id=d.owner_id WHERE d.id=$1 AND d.owner_id=$2`,[documentId,ownerId])).rows[0]);
  if (!doc) throw new Error('Document not found.');
  const timings:Record<string,number> = {}; let last = Date.now();
  const stage = async (status:string, progress:number) => {
    await withUser(ownerId, async tx => { await assertLease(tx,ownerId,documentId,lease); await tx.query('UPDATE documents SET status=$1,progress=$2,error=NULL,updated_at=now() WHERE id=$3 AND owner_id=$4',[status,progress,documentId,ownerId]); });
  };
  const clock = (key:string) => { timings[key] = Date.now()-last; last = Date.now(); };
  await stage('VALIDATING',10); const bytes = await getObject(doc.storage_key); validateUpload(doc.filename,doc.content_type,bytes);
  if (createHash('sha256').update(bytes).digest('hex')!==doc.checksum) throw new Error('Document integrity check failed. Please upload the file again.');
  clock('validationMs');
  await stage('EXTRACTING',25); const extracted = await extractDocument(doc.filename,bytes); clock('extractionMs');
  await stage('CHUNKING',45); const chunks = chunkSegments(extracted.segments,doc.chunk_size,doc.chunk_overlap);
  if (!chunks.length) throw new Error('No readable text was found in this document. Scanned PDFs require OCR.');
  if (chunks.length > 2000) throw new Error('Document has too many chunks.');
  clock('chunkingMs'); await stage('EMBEDDING',60);
  const provider = embeddingProvider(); const embedded = await provider.embed(chunks.map(c => c.content)); clock('embeddingMs');
  await stage('INDEXING',88);
  await withUser(ownerId, async tx => {
    // Hold the current attempt's job row through the atomic replacement.
    // A recovered worker cannot commit chunks, status or usage for a newer lease.
    await assertLease(tx,ownerId,documentId,lease);
    await tx.query('DELETE FROM document_chunks WHERE document_id=$1 AND owner_id=$2',[documentId,ownerId]);
    for (let i=0;i<chunks.length;i++) {
      const c = chunks[i];
      await tx.query(`INSERT INTO document_chunks(id,document_id,collection_id,owner_id,chunk_index,content,page_number,section_title,token_count,embedding_model,embedding)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::vector)`,[randomUUID(),documentId,doc.collection_id,ownerId,i,c.content,c.page_number,c.section_title,c.token_count,provider.model,vectorLiteral(embedded.vectors[i])]);
    }
    timings.indexingMs = Date.now()-last;
    await tx.query(`UPDATE documents SET status='READY',progress=100,page_count=$1,error=NULL,timings=$2::jsonb,updated_at=now() WHERE id=$3 AND owner_id=$4`,[extracted.pageCount,JSON.stringify(timings),documentId,ownerId]);
    await tx.query('INSERT INTO usage_events(id,owner_id,kind,model,input_tokens,latency_ms) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),ownerId,'embedding',provider.model,embedded.tokens ?? null,timings.embeddingMs]);
  });
  console.info(JSON.stringify({event:'document.indexed',documentId,chunkCount:chunks.length,timings}));
}
async function runPendingDeletion(ownerId:string) {
  const job=await withUser(ownerId,async tx=>{
    await tx.query("UPDATE storage_deletions SET status='QUEUED',locked_at=NULL WHERE owner_id=$1 AND status='PROCESSING' AND locked_at < now()-interval '5 minutes'",[ownerId]);
    return (await tx.query(`UPDATE storage_deletions SET status='PROCESSING',attempts=attempts+1,locked_at=now() WHERE id=(SELECT id FROM storage_deletions WHERE owner_id=$1 AND status='QUEUED' AND available_at<=now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,[ownerId])).rows[0];
  });
  if (!job) return false;
  try { await deleteObject(job.storage_key); await withUser(ownerId,async tx=>{await tx.query("DELETE FROM storage_deletions WHERE id=$1 AND owner_id=$2 AND status='PROCESSING' AND attempts=$3",[job.id,ownerId,job.attempts]);}); }
  catch { await withUser(ownerId,async tx=>{await tx.query("UPDATE storage_deletions SET status=$1,locked_at=NULL,available_at=now()+($2 * interval '1 second') WHERE id=$3 AND owner_id=$4 AND status='PROCESSING' AND attempts=$5",[job.attempts>=10?'FAILED':'QUEUED',Math.min(3600,2**job.attempts),job.id,ownerId,job.attempts]);}); console.warn(JSON.stringify({event:'storage.deletion_failed',attempt:job.attempts})); }
  return true;
}
export async function runPendingForUser(ownerId:string) {
  const job = await withUser(ownerId, async tx => {
    // Expired leases are recoverable after a worker crash; exhausted jobs are dead-lettered.
    const exhausted = (await tx.query(`UPDATE ingestion_jobs SET status='FAILED',locked_at=NULL,last_error='Processing was interrupted too many times.' WHERE owner_id=$1 AND status='PROCESSING' AND attempts>=max_attempts AND locked_at < now() - interval '5 minutes' RETURNING document_id`,[ownerId])).rows;
    for (const item of exhausted) await tx.query(`UPDATE documents SET status='FAILED',progress=0,error='Processing was interrupted too many times. Please retry.',updated_at=now() WHERE id=$1 AND owner_id=$2`,[item.document_id,ownerId]);
    await tx.query(`UPDATE ingestion_jobs SET status='QUEUED',locked_at=NULL,available_at=now() WHERE owner_id=$1 AND status='PROCESSING' AND locked_at < now() - interval '5 minutes'`,[ownerId]);
    return (await tx.query(`UPDATE ingestion_jobs SET status='PROCESSING',attempts=attempts+1,locked_at=now(),updated_at=now()
      WHERE id=(SELECT id FROM ingestion_jobs WHERE owner_id=$1 AND status='QUEUED' AND available_at <= now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,[ownerId])).rows[0];
  });
  if (!job) return runPendingDeletion(ownerId);
  const heartbeat = setInterval(() => { void withUser(ownerId, async tx => { await tx.query("UPDATE ingestion_jobs SET locked_at=now() WHERE id=$1 AND owner_id=$2 AND status='PROCESSING' AND attempts=$3",[job.id,ownerId,job.attempts]); }).catch(() => {}); },30000);
  heartbeat.unref?.();
  try {
    await processDocument(ownerId,job.document_id,{id:job.id,attempt:job.attempts});
    await withUser(ownerId, async tx => { await tx.query("UPDATE ingestion_jobs SET status='DONE',locked_at=NULL,updated_at=now() WHERE id=$1 AND owner_id=$2 AND status='PROCESSING' AND attempts=$3",[job.id,ownerId,job.attempts]); });
  } catch (error) {
    const message = safeError(error); const final = job.attempts >= job.max_attempts;
    const updated=await withUser(ownerId, async tx => {
      const rows=(await tx.query(`UPDATE ingestion_jobs SET status=$1,last_error=$2,locked_at=NULL,available_at=now() + ($3 * interval '1 second'),updated_at=now() WHERE id=$4 AND owner_id=$5 AND status='PROCESSING' AND attempts=$6 RETURNING id`,[final?'FAILED':'QUEUED',message,Math.min(60,2**job.attempts),job.id,ownerId,job.attempts])).rows;
      if (!rows.length) return false;
      await tx.query(`UPDATE documents SET status=$1,progress=0,error=$2,updated_at=now() WHERE id=$3 AND owner_id=$4`,[final?'FAILED':'UPLOADED',final?message:`${message} Retrying automatically.`,job.document_id,ownerId]);
      return true;
    });
    if (updated) console.warn(JSON.stringify({event:'document.processing_failed',documentId:job.document_id,attempt:job.attempts,final}));
  } finally { clearInterval(heartbeat); }
  await runPendingDeletion(ownerId);
  return true;
}
declare global { var __contextvaultWorker: ReturnType<typeof setInterval> | undefined; var __contextvaultWorking: boolean | undefined; }
export function startEmbeddedWorker() {
  if (process.env.DATABASE_URL || process.env.DISABLE_EMBEDDED_WORKER === 'true' || globalThis.__contextvaultWorker) return;
  globalThis.__contextvaultWorker = setInterval(async () => {
    if (globalThis.__contextvaultWorking) return; globalThis.__contextvaultWorking = true;
    try { const { database } = await import('../db'); const users = (await (await database()).query('SELECT id FROM users')).rows;
      for (const user of users) await runPendingForUser(user.id);
    } catch { console.error(JSON.stringify({event:'worker.poll_failed'})); } finally { globalThis.__contextvaultWorking = false; }
  },1500);
  globalThis.__contextvaultWorker.unref?.();
}
