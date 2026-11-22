export const PAGES = ['overview','chat','documents','collections','playground','evaluation','architecture','settings'] as const;
export type Page = typeof PAGES[number];
/** The page named by the URL hash, so a refresh, a shared link and the back button keep the place. */
export const pageFromHash = (): Page | null => { const name = typeof window === 'undefined' ? '' : window.location.hash.replace(/^#\/?/, ''); return (PAGES as readonly string[]).includes(name) ? name as Page : null; };
export interface User { id:string; email:string; display_name:string; role:'user'|'developer' }
export interface Collection { id:string; name:string; description:string; color:string; document_count:number; ready_count:number; chunk_size:number; chunk_overlap:number; created_at:string }
export interface Document { id:string; collection_id:string; filename:string; content_type:string; file_size:number; page_count:number|null; status:string; progress:number; error:string|null; tags:string[]; archived:boolean; timings:Record<string,number>; created_at:string; updated_at:string; collection_name:string; collection_color:string; chunk_count:number; embedding_model:string|null }
export interface Conversation { id:string; title:string; collection_id:string; collection_name:string; collection_color:string; updated_at:string }
export interface Chunk { id?:string; chunk_id?:string; document_id:string|null; filename:string|null; content:string|null; page_number:number|null; section_title:string|null; chunk_index:number|null; similarity:number|null; lexical_score?:number; rank_score?:number; citation_index?:number }
export interface Message { id:string; role:'USER'|'ASSISTANT'|'SYSTEM'; content:string; model:string; metadata?:{promptVersion?:string;embeddingModel?:string|null;timings?:{retrievalMs:number;llmMs:number;totalMs:number}}; citations?:Chunk[]; retrieval?:{strategy:string;durationMs:number;chunks:Chunk[]} }
export interface WorkspaceData { user:User; collections:Collection[]; documents:Document[]; conversations:Conversation[]; stats:{chunks:number;queries:number}; config:{demo:boolean;aiProvider:string;embeddingProvider:string;externalAI:boolean;storage:string;embedded:boolean} }
export interface RagResult { answer:string; used:number[]; chunks:Chunk[]; query:string; model:string; embeddingModel:string|null; strategy:string; timings:{retrievalMs:number;llmMs:number;totalMs:number}; usage:{inputTokens:number|null;outputTokens:number|null}; metrics?:{precision:number|null;recall:number|null;citationCorrectness:boolean|null;expectedPhraseFound:boolean|null;faithfulness:null;completeness:null} }
export interface RetrievalComparison { query:string; results:{strategy:'keyword'|'vector'|'hybrid';chunks:Chunk[];durationMs:number|null;error:string|null}[]; embeddingModel:string|null; embeddingMs:number|null; totalMs:number; collectionName:string; settings:{topK:number;threshold:number;rerank:boolean;filters:string[]} }
export async function api<T=any>(path:string, options:RequestInit={}):Promise<T> {
  const headers=new Headers(options.headers); if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type','application/json');
  const res=await fetch(`/api/${path}`,{...options,headers,cache:'no-store'});
  const value=await res.json().catch(()=>({})); if (!res.ok) throw new Error(value.error || 'Something went wrong. Please try again.'); return value as T;
}
export function formatSize(bytes:number) { return bytes<1024 ? `${bytes} B` : bytes<1024*1024 ? `${(bytes/1024).toFixed(1)} KB` : `${(bytes/1024/1024).toFixed(1)} MB`; }
export function formatDate(value:string) { return new Date(value).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
export function shortDate(value:string) { return new Date(value).toLocaleDateString('en-US',{month:'short',day:'numeric'}); }
export function initial(name:string) { return name.split(' ').filter(Boolean).map(s=>s[0]).slice(0,2).join('').toUpperCase(); }
export function ext(name:string) { return name.split('.').pop()?.toUpperCase() || 'FILE'; }
