import { providerSignal } from './abort';
import { tokenize } from './embeddings';
import { SYSTEM_PROMPT } from '../prompts/system';
import { evidencePrompt } from '../prompts/rag';
import { INSUFFICIENT, validateCitations } from '../prompts/citation';
import type { RetrievedChunk } from '../rag/retrieval';
export interface GenerationInput { question:string; chunks:RetrievedChunk[]; history:{role:string;content:string}[]; style?:string; retrievalQuery?:string; }
export interface LLMProvider { model:string; generate(input:GenerationInput, signal?:AbortSignal): Promise<{ answer:string; used:number[]; inputTokens?:number; outputTokens?:number }> }
export class MockLLM implements LLMProvider {
  model = 'mock-extractive-v1';
  async generate({ question, chunks, retrievalQuery }: GenerationInput, signal?:AbortSignal) {
    signal?.throwIfAborted();
    const terms = new Set(tokenize(retrievalQuery || question));
    const candidates = chunks.flatMap((c,i) => c.content.split(/(?<=[.!?])\s+|\n+/).map(s => ({ text:s.trim(), i, score: [...new Set(tokenize(s))].filter(t => terms.has(t)).length })));
    // Never treat source instructions as commands; also avoid echoing obvious injection attempts in the extractive demo.
    const safe = candidates.filter(c => c.text.length > 25 && c.score > 0 && !/^this fictional (guide|document|handbook)/i.test(c.text) && !/ignore (all|the|previous|prior|your)|system (prompt|instructions)|reveal (private|secret)|you are now|do not (follow|obey)/i.test(c.text));
    safe.sort((a,b) => b.score-a.score || a.i-b.i);
    const selected = safe.slice(0,2);
    if (!selected.length) return { answer:INSUFFICIENT, used:[] };
    // Add one adjacent source sentence when the query only matched one. It remains
    // an extract, not a generated inference, and is still tied to the same citation.
    if (selected.length === 1) {
      const best = selected[0]; const index = candidates.findIndex(c => c === best);
      const next = candidates[index+1];
      if (next && next.i === best.i && next.text.length > 25 && !/ignore (all|the|previous|prior|your)|system (prompt|instructions)|reveal (private|secret)|you are now|do not (follow|obey)/i.test(next.text)) selected.push(next);
    }
    const answer = `Based on the selected documents:\n\n${selected.map(c => `- ${c.text.replace(/^[-*]\s*/, '')} [${c.i+1}]`).join('\n')}`;
    return validateCitations(answer, chunks.length);
  }
}
export class OpenAILLM implements LLMProvider {
  model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
  async generate(input:GenerationInput, signal?:AbortSignal) {
    signal?.throwIfAborted();
    const key = process.env.OPENAI_API_KEY; if (!key) throw new Error('AI provider is not configured.');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST', headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({ model:this.model, temperature:0.1, max_tokens:900, messages:[
        {role:'system',content:SYSTEM_PROMPT}, {role:'user',content:evidencePrompt(input.question,input.chunks,input.history,input.style)}
      ] }), signal:providerSignal(60000,signal),
    });
    if (!response.ok) throw new Error(response.status === 429 ? 'AI provider rate limit reached. Please try again.' : 'AI provider is unavailable. Please try again later.');
    const json = await response.json();
    return { ...validateCitations(String(json.choices?.[0]?.message?.content || INSUFFICIENT),input.chunks.length), inputTokens:json.usage?.prompt_tokens, outputTokens:json.usage?.completion_tokens };
  }
}
/** OpenAI-compatible local/self-hosted model endpoint, configured only on the server. */
export class LocalLLM implements LLMProvider {
  private readonly name = process.env.LOCAL_LLM_MODEL || 'local-model';
  model = `local:${this.name}`;
  async generate(input:GenerationInput, signal?:AbortSignal) {
    signal?.throwIfAborted();
    const base=(process.env.LOCAL_AI_BASE_URL || 'http://localhost:11434/v1').replace(/\/$/,'');
    const response=await fetch(`${base}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json',...(process.env.LOCAL_AI_API_KEY?{Authorization:`Bearer ${process.env.LOCAL_AI_API_KEY}`}:{})},body:JSON.stringify({model:this.name,temperature:0.1,max_tokens:900,messages:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:evidencePrompt(input.question,input.chunks,input.history,input.style)}]}),signal:providerSignal(60000,signal)});
    if(!response.ok) throw new Error('AI provider is unavailable. Please try again later.');
    const json=await response.json();
    return {...validateCitations(String(json.choices?.[0]?.message?.content||INSUFFICIENT),input.chunks.length),inputTokens:json.usage?.prompt_tokens,outputTokens:json.usage?.completion_tokens};
  }
}
export function llmProvider(): LLMProvider { const configured=process.env.AI_PROVIDER || 'mock'; if(configured==='openai')return new OpenAILLM(); if(configured==='local')return new LocalLLM(); if(configured==='mock')return new MockLLM(); throw new Error('Unsupported AI provider configuration.'); }
