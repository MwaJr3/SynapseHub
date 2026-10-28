import { providerSignal } from './abort';
export const DIMENSIONS = 1536;
export interface EmbeddingProvider {
  readonly model: string;
  embed(texts: string[], signal?:AbortSignal): Promise<{ vectors: number[][]; tokens?: number }>;
}
const STOP = new Set('a an the is are was were be been being of to and or in on for with that this it as at by from into its their what how why when where does do can could would should about your our my which who than then also'.split(' '));
const ALIASES: Record<string, string> = { documents:'document', chunks:'chunk', embeddings:'embedding', vectors:'vector', sources:'source', searches:'search', searching:'search', retrieved:'retrieve', retrieval:'retrieve', retrieving:'retrieve', databases:'database', questions:'question', answers:'answer', policies:'policy', security:'secure', authorization:'access', permissions:'access', authorized:'access', citations:'citation' };
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9_-]{1,}/g) || []).map((t) => ALIASES[t] || t).filter((t) => !STOP.has(t));
}
function hash(text: string): number {
  let h = 2166136261; for (let i=0;i<text.length;i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** Deterministic token hashing for tests/demo. It is NOT a semantic embedding model. */
export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly model = 'mock-hash-v1-1536';
  async embed(texts: string[], signal?:AbortSignal) {
    signal?.throwIfAborted();
    return { vectors: texts.map((text) => {
      const out = Array<number>(DIMENSIONS).fill(0);
      for (const token of tokenize(text)) out[hash(token) % DIMENSIONS] += 1;
      const norm = Math.sqrt(out.reduce((sum, n) => sum + n*n, 0));
      if (!norm) out[0] = 1; else for (let i=0;i<out.length;i++) out[i] /= norm;
      return out;
    }) };
  }
}
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly model = 'text-embedding-3-small-1536';
  async embed(texts: string[], signal?:AbortSignal) {
    signal?.throwIfAborted();
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('Embedding provider is not configured.');
    const vectors: number[][] = []; let tokens = 0;
    for (let i=0; i<texts.length; i+=32) {
      signal?.throwIfAborted();
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'text-embedding-3-small', dimensions: DIMENSIONS, input: texts.slice(i,i+32) }),
        signal: providerSignal(45000,signal),
      });
      if (!response.ok) throw new Error('Embedding provider is unavailable. Please try again later.');
      const json = await response.json();
      if (!Array.isArray(json.data) || json.data.length !== texts.slice(i,i+32).length) throw new Error('Embedding provider returned an incompatible vector.');
      for (const item of json.data) {
        if (!Array.isArray(item.embedding) || item.embedding.length !== DIMENSIONS) throw new Error('Embedding provider returned an incompatible vector.');
        vectors.push(item.embedding);
      }
      tokens += json.usage?.total_tokens || 0;
    }
    return { vectors, tokens };
  }
}
/** OpenAI-compatible local/self-hosted server; the model must output 1536 dimensions. */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  private readonly name = process.env.LOCAL_EMBEDDING_MODEL || 'local-1536';
  readonly model = `local:${this.name}:1536`;
  async embed(texts:string[], signal?:AbortSignal) {
    signal?.throwIfAborted();
    const base = (process.env.LOCAL_AI_BASE_URL || 'http://localhost:11434/v1').replace(/\/$/,'');
    const vectors:number[][]=[]; let tokens=0; let reported=false;
    for(let i=0;i<texts.length;i+=32) {
      signal?.throwIfAborted();
      const batch=texts.slice(i,i+32);
      const response = await fetch(`${base}/embeddings`, { method:'POST', headers:{'Content-Type':'application/json',...(process.env.LOCAL_AI_API_KEY ? {Authorization:`Bearer ${process.env.LOCAL_AI_API_KEY}`} : {})}, body:JSON.stringify({model:this.name,input:batch}), signal:providerSignal(45000,signal) });
      if (!response.ok) throw new Error('Embedding provider is unavailable. Please try again later.');
      const json=await response.json();
      const output=(json.data || []).map((item:{embedding:number[]})=>item.embedding);
      if (output.length!==batch.length || output.some((v:number[])=>!Array.isArray(v)||v.length!==DIMENSIONS||v.some(n=>!Number.isFinite(n)))) throw new Error('Embedding provider returned an incompatible vector.');
      vectors.push(...output); if (typeof json.usage?.total_tokens==='number') { tokens+=json.usage.total_tokens; reported=true; }
    }
    return {vectors,tokens:reported?tokens:undefined};
  }
}
export function embeddingProvider(): EmbeddingProvider {
  const configured=process.env.EMBEDDING_PROVIDER || 'mock';
  if (configured === 'openai') return new OpenAIEmbeddingProvider();
  if (configured === 'local') return new LocalEmbeddingProvider();
  if (configured === 'mock') return new MockEmbeddingProvider();
  throw new Error('Unsupported embedding provider configuration.');
}
export function vectorLiteral(vector: number[]): string {
  if (vector.length !== DIMENSIONS || vector.some((n) => !Number.isFinite(n)) || !vector.some((n) => n !== 0)) throw new Error('Invalid embedding dimensions.');
  return `[${vector.join(',')}]`;
}
