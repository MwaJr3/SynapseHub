import { randomUUID } from 'node:crypto';
import { withUser } from '../db';
import { llmProvider } from '../ai/llm';
import { INSUFFICIENT } from '../prompts/citation';
import { PROMPT_VERSION } from '../prompts/system';
import { normalizeQuery, retrieve, type RetrievalOptions } from './retrieval';

export async function runRag(ownerId:string, collectionId:string, question:string, history:{role:string;content:string}[] = [], options:RetrievalOptions & {style?:string} = {}) {
  options.signal?.throwIfAborted();
  const start = Date.now();
  const previousQuestion = [...history].reverse().find(m => m.role === 'USER')?.content;
  const query = normalizeQuery(question, previousQuestion);
  const retrieval = await retrieve(ownerId,collectionId,query,options);
  const provider = llmProvider(); const llmStart = Date.now();
  const generation = retrieval.chunks.length ? await provider.generate({ question, chunks:retrieval.chunks, history:history.slice(-4), style:options.style, retrievalQuery:query },options.signal) : { answer:INSUFFICIENT, used:[] as number[] };
  options.signal?.throwIfAborted();
  const llmMs = Date.now()-llmStart; const totalMs = Date.now()-start;
  if (retrieval.chunks.length) await withUser(ownerId, async tx => {
    await tx.query('INSERT INTO usage_events(id,owner_id,kind,model,input_tokens,output_tokens,latency_ms) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [randomUUID(),ownerId,'generation',provider.model,generation.inputTokens ?? null,generation.outputTokens ?? null,llmMs]);
  });
  options.signal?.throwIfAborted();
  // Labels in a response are contiguous even when the model cites only the
  // second or fourth retrieved chunk. `used` retains original retrieval indexes.
  const labels = new Map(generation.used.map((n,i) => [n,i+1]));
  const answer = generation.answer.replace(/\[(\d+)\]/g, (match,n) => labels.has(Number(n)) ? `[${labels.get(Number(n))}]` : match);
  return { answer, used:generation.used, chunks:retrieval.chunks, query, model:provider.model,
    embeddingModel:retrieval.model, strategy:retrieval.strategy, promptVersion:PROMPT_VERSION,
    timings:{retrievalMs:retrieval.durationMs,llmMs,totalMs}, usage:{inputTokens:generation.inputTokens ?? null,outputTokens:generation.outputTokens ?? null} };
}
