import { randomUUID } from 'node:crypto';
import { withUser } from '../db';
import { embeddingProvider, tokenize, vectorLiteral } from '../ai/embeddings';

export type Strategy = 'hybrid' | 'vector' | 'keyword';
export interface RetrievalOptions { topK?: number; threshold?: number; strategy?: Strategy; rerank?: boolean; documentId?: string; documentType?: string; tags?: string[]; createdAfter?: string; createdBefore?: string; signal?:AbortSignal; }
export interface RetrievedChunk {
  id: string; document_id: string; filename: string; content_type: string; content: string;
  page_number: number | null; section_title: string | null; chunk_index: number;
  similarity: number | null; lexical_score: number; rank_score: number;
}
export function normalizeQuery(question: string, previousQuestion?: string): string {
  const clean = question.replace(/\s+/g,' ').trim().slice(0,2000);
  // A bounded conversational rewrite, rather than concatenating the full history.
  if (previousQuestion && (/\b(it|its|they|them|their|those|that|this|these|he|she)\b/i.test(clean) || tokenize(clean).length <= 3)) {
    return `${previousQuestion.slice(0,500)} ${clean}`;
  }
  return clean;
}
type PreparedEmbedding = { literal:string; model:string; durationMs:number };
async function authorizeScope(ownerId:string, collectionId:string) {
  const allowed = await withUser(ownerId, async (tx) => (await tx.query('SELECT id FROM collections WHERE id=$1 AND owner_id=$2', [collectionId,ownerId])).rows.length > 0);
  if (!allowed) throw new Error('Collection not found.');
}
async function prepareEmbedding(ownerId:string, question:string, signal?:AbortSignal):Promise<PreparedEmbedding> {
  signal?.throwIfAborted();
  const provider=embeddingProvider(), start=Date.now();
  const embedded=await provider.embed([question],signal);
  signal?.throwIfAborted();
  const durationMs=Date.now()-start, literal=vectorLiteral(embedded.vectors[0]);
  // Record the provider request once, even when its vector is shared by the
  // comparison's vector and hybrid searches.
  await withUser(ownerId, async tx => { await tx.query('INSERT INTO usage_events(id,owner_id,kind,model,input_tokens,latency_ms) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),ownerId,'query_embedding',provider.model,embedded.tokens ?? null,durationMs]); });
  return {literal,model:provider.model,durationMs};
}
export async function retrieve(ownerId: string, collectionId: string, question: string, options: RetrievalOptions = {}, prepared?:PreparedEmbedding) {
  const started = Date.now();
  const topK = Math.max(1, Math.min(8, Math.floor(options.topK ?? 4)));
  const threshold = Math.max(0, Math.min(1, Number(options.threshold ?? 0.08)));
  const strategy = options.strategy || 'hybrid';
  await authorizeScope(ownerId,collectionId);
  options.signal?.throwIfAborted();
  // Authorize before any provider call. Pure keyword search does not need an
  // embedding at all, so it can also search chunks from older model versions.
  const embedded = strategy === 'keyword' ? null : prepared || await prepareEmbedding(ownerId,question,options.signal);
  const literal=embedded?.literal || null, model=embedded?.model || null;
  const results = await withUser(ownerId, async (tx) => {
    const args: any[] = [question, ownerId, collectionId];
    let vectorParam = '', modelParam = '';
    if (literal && model) { args.push(literal,model); vectorParam='$4'; modelParam='$5'; }
    let filters = '';
    if (options.documentId) { args.push(options.documentId); filters += ` AND d.id=$${args.length}`; }
    if (options.documentType) { args.push(options.documentType); filters += ` AND d.content_type=$${args.length}`; }
    if (options.tags?.length) { args.push(options.tags); filters += ` AND d.tags @> $${args.length}::text[]`; }
    if (options.createdAfter) { args.push(options.createdAfter); filters += ` AND d.created_at >= $${args.length}::date`; }
    if (options.createdBefore) { args.push(options.createdBefore); filters += ` AND d.created_at < ($${args.length}::date + interval '1 day')`; }
    // Similarity is meaningful only for the query's embedding model. Lexical
    // results from other model versions are still searchable, with no vector score.
    const similarity = literal ? `CASE WHEN c.embedding_model=${modelParam} THEN (1 - (c.embedding <=> ${vectorParam}::vector))::float8 ELSE NULL END` : 'NULL::float8';
    const select = `SELECT c.id,c.document_id,d.filename,d.content_type,c.content,c.page_number,c.section_title,c.chunk_index,
      ${similarity} AS similarity,
      ts_rank_cd(c.search_vector,websearch_to_tsquery('english',$1))::float8 AS lexical_score
      FROM document_chunks c JOIN documents d ON d.id=c.document_id AND d.owner_id=c.owner_id
      WHERE c.owner_id=$2 AND c.collection_id=$3 AND d.owner_id=$2
        AND d.collection_id=$3 AND d.status='READY' AND NOT d.archived ${filters}`;
    const vector = strategy === 'keyword' ? [] : (await tx.query(`${select} AND c.embedding_model=${modelParam} ORDER BY c.embedding <=> ${vectorParam}::vector LIMIT 40`,args)).rows
      .filter(row => Number(row.similarity) >= threshold);
    const keyword = strategy === 'vector' ? [] : (await tx.query(`${select} AND c.search_vector @@ websearch_to_tsquery('english',$1) ORDER BY lexical_score DESC LIMIT 40`,args)).rows;
    const merged = new Map<string, any>();
    vector.forEach((row,i) => merged.set(row.id,{ ...row, vrank:i+1 }));
    keyword.forEach((row,i) => merged.set(row.id,{ ...(merged.get(row.id) || row), krank:i+1 }));
    const qtokens = new Set(tokenize(question));
    return [...merged.values()].map((row) => {
      const overlap = [...new Set(tokenize(row.content))].filter((t) => qtokens.has(t)).length / Math.max(1,qtokens.size);
      const rank = strategy === 'vector' ? Number(row.similarity) : strategy === 'keyword' ? Number(row.lexical_score) :
        (row.vrank ? 1/(60+row.vrank) : 0) + (row.krank ? 1/(60+row.krank) : 0);
      return { ...row, similarity:row.similarity == null ? null : Number(row.similarity), lexical_score:Number(row.lexical_score), rank_score:rank + (options.rerank ? overlap*0.03 : 0) } as RetrievedChunk;
    }).sort((a,b) => b.rank_score-a.rank_score).slice(0,topK);
  });
  options.signal?.throwIfAborted();
  return { chunks: results, durationMs: Date.now()-started, model, strategy, query: question };
}

/** Compare retrieval only: no prompt or document content is sent to an LLM. */
export async function compareRetrieval(ownerId:string, collectionId:string, question:string, options:RetrievalOptions={}) {
  const start=Date.now();
  // This must happen before the shared embedding request or any query.
  await authorizeScope(ownerId,collectionId);
  options.signal?.throwIfAborted();
  const failure=(strategy:Strategy, error:string)=>({strategy,chunks:[] as RetrievedChunk[],durationMs:null,error});
  const run=async(strategy:Strategy, prepared?:PreparedEmbedding)=>{
    try {
      const result=await retrieve(ownerId,collectionId,question,{...options,strategy},prepared);
      return {strategy,chunks:result.chunks,durationMs:result.durationMs,error:null};
    } catch (error) {
      if (!options.signal?.aborted) console.warn(JSON.stringify({event:'retrieval.compare_failed',strategy,type:error instanceof Error ? error.name : 'unknown'}));
      return failure(strategy,'Retrieval is unavailable. Please try again.');
    }
  };
  const keywordResult=await run('keyword');
  options.signal?.throwIfAborted();
  let prepared:PreparedEmbedding | undefined, embeddingError:string | undefined;
  try { prepared=await prepareEmbedding(ownerId,question,options.signal); }
  catch (error) {
    if (!options.signal?.aborted) console.warn(JSON.stringify({event:'retrieval.compare_embedding_failed',type:error instanceof Error ? error.name : 'unknown'}));
    const message=error instanceof Error ? error.message : '';
    embeddingError=message.startsWith('Embedding provider') ? message : 'Embedding provider is unavailable. Please try again.';
  }
  const [vectorResult,hybridResult]=await Promise.all([
    prepared ? run('vector',prepared) : Promise.resolve(failure('vector',embeddingError!)),
    prepared ? run('hybrid',prepared) : Promise.resolve(failure('hybrid',embeddingError!)),
  ]);
  options.signal?.throwIfAborted();
  return {query:question,results:[keywordResult,vectorResult,hybridResult],embeddingModel:prepared?.model || null,embeddingMs:prepared?.durationMs ?? null,totalMs:Date.now()-start};
}
