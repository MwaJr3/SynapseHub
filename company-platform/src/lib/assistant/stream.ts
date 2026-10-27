/**
 * One assistant turn, streamed.
 *
 * Shape of the response — the same four events the Tessera tutor uses, so the
 * two products behave alike without sharing a vendor:
 *
 *   event: step       data: {"steps": [{label, detail, ok}]}
 *   event: delta      data: {"text": "..."}
 *   event: citations  data: {"citations": [{id, title}]}
 *   event: error      data: {"message": "...", "retryable": true}
 *   event: done       data: {"ok": true}
 *
 * Two rules that matter more than the format:
 * - **Grounding happens before the model is called.** If nothing in the corpus
 *   matches, the model is told so and is required to say it cannot help.
 * - **A provider failure is reported, never papered over.** No partial answer is
 *   invented and no success event is emitted.
 */
import { ASSISTANTS, type AssistantName } from '@/content/assistants';
import { FLOWS, composeTemperature, maxTokens, retrieveLimit } from '@/content/flows';
import { checkAnswer, runFlow } from './flow';
import { assistantConfig, providerToken, type AssistantProviderConfig } from './provider';
import { contextBlock, retrieve } from './retrieve';

export interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export function sse(event: string, payload: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export function systemPrompt(name: AssistantName, grounded: string): string {
  const assistant = ASSISTANTS[name];
  return [
    `You are the ${assistant.title} assistant for ${assistant.company}.`,
    assistant.intro,
    '',
    'Rules:',
    ...assistant.guardrails.map((rule) => `- ${rule}`),
    '',
    grounded,
    '',
    'Style: short paragraphs. No filler, no motivational padding, no emoji.',
  ].join('\n');
}

/** History is trimmed and coerced: a client cannot inject a system turn. */
export function cleanHistory(history: readonly Turn[], limit = 12): Turn[] {
  return history
    .filter((turn) => (turn.role === 'user' || turn.role === 'assistant') && turn.text.trim().length > 0)
    .slice(-limit)
    .map((turn) => ({ role: turn.role, text: turn.text.slice(0, 4000) }));
}

export function requestBody(
  config: AssistantProviderConfig,
  name: AssistantName,
  message: string,
  history: readonly Turn[],
): Record<string, unknown> {
  const flow = FLOWS[name];
  const passages = retrieve(ASSISTANTS[name].corpus, message, retrieveLimit(flow));
  const messages = [
    { role: 'system', content: systemPrompt(name, contextBlock(passages)) },
    ...cleanHistory(history).map((turn) => ({ role: turn.role, content: turn.text })),
    { role: 'user', content: message },
  ];
  return {
    model: config.model,
    messages,
    stream: true,
    // Read from the flow, so the settings and the displayed diagram agree.
    temperature: composeTemperature(flow),
    max_tokens: maxTokens(flow),
  };
}

/** Pull the text out of one OpenAI-style streaming chunk. */
export function chunkText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return '';
  const delta = (choices[0] as { delta?: unknown }).delta;
  if (!delta || typeof delta !== 'object') return '';
  const content = (delta as { content?: unknown }).content;
  return typeof content === 'string' ? content : '';
}

export async function* streamAnswer(
  name: AssistantName,
  message: string,
  history: readonly Turn[],
  deps: { fetchImpl?: FetchLike; config?: AssistantProviderConfig } = {},
): AsyncGenerator<string> {
  const config = deps.config ?? assistantConfig();
  if (!config.configured) {
    yield sse('error', { message: config.reason, retryable: false });
    return;
  }
  const fetchImpl = deps.fetchImpl ?? (fetch as FetchLike);

  const flow = FLOWS[name];
  const passages = retrieve(ASSISTANTS[name].corpus, message, retrieveLimit(flow));
  const decision = runFlow(flow, {
    question: message,
    passages: passages.map(({ id, title, score }) => ({ id, title, score })),
  });

  // The trace goes first: what the assistant did, before what it says.
  yield sse('step', { steps: decision.steps.map(({ label, detail, ok }) => ({ label, detail, ok })) });

  if (!decision.proceed) {
    // A guard stopped it. The visitor is told plainly, and no model is called.
    yield sse('error', { message: decision.refusal ?? 'No material covers that.', retryable: false });
    return;
  }

  const body = requestBody(config, name, message, history);

  let response: Response;
  try {
    response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${providerToken(config)}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    yield sse('error', {
      message: 'The model provider could not be reached, so nothing was generated.',
      retryable: true,
    });
    return;
  }

  if (!response.ok || !response.body) {
    yield sse('error', {
      message: `The model provider returned ${response.status}, so nothing was generated.`,
      retryable: response.status >= 500 || response.status === 429,
    });
    return;
  }

  // What the answer is allowed to lean on, sent before the text arrives.
  if (passages.length > 0) {
    yield sse('citations', {
      citations: passages.map((passage) => ({ id: passage.id, title: passage.title })),
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let emitted = false;
  let answer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const line = frame.split('\n').find((candidate) => candidate.startsWith('data:'));
      if (!line) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const text = chunkText(JSON.parse(data));
        if (text) {
          emitted = true;
          answer += text;
          yield sse('delta', { text });
        }
      } catch {
        // A malformed chunk is skipped; half a JSON frame is not an answer.
      }
    }
  }

  if (!emitted) {
    yield sse('error', { message: 'The model returned nothing. Nothing has been added.', retryable: true });
    return;
  }
  // The answer is checked against what the flow said it would produce. A short
  // or truncated answer is reported as unfinished rather than passed off as a
  // complete one; `ok: false` tells the interface to say so.
  const problems = checkAnswer(flow.expects, answer);
  yield sse('done', { ok: problems.length === 0, problems });
}
