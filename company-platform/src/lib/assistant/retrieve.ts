/**
 * Grounding for the assistants: choose the passages an answer may rely on.
 *
 * Deliberately not embeddings. This is a token-overlap score, so it is
 * deterministic, cheap, explainable, and it fails loudly: when nothing scores,
 * the assistant is told there is no material and must say so rather than answer
 * from the model's own memory. Semantic search would be better at paraphrase and
 * is not what this is.
 */
import type { CorpusEntry } from '@/content/assistants';

/** Words too common to signal relevance. Kept short on purpose. */
const STOPWORDS = new Set([
  'a', 'about', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'can', 'do', 'does',
  'for', 'from', 'get', 'got', 'has', 'have', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just',
  'me', 'my', 'not', 'of', 'on', 'or', 'our', 'should', 'so', 'some', 'that', 'the', 'their', 'them',
  'then', 'there', 'these', 'they', 'this', 'to', 'we', 'what', 'when', 'where', 'which', 'who', 'why',
  'will', 'with', 'you', 'your',
]);

export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

export interface Passage {
  id: string;
  title: string;
  text: string;
  score: number;
}

/**
 * Score a passage. A term in the title counts double: titles are short and
 * hand-written to say what the entry is about.
 */
export function scorePassage(questionTokens: Set<string>, entry: CorpusEntry): number {
  const titleTokens = new Set(tokenise(entry.title));
  const bodyTokens = tokenise(entry.text);
  if (bodyTokens.length === 0) return 0;

  let hits = 0;
  for (const token of bodyTokens) if (questionTokens.has(token)) hits += 1;
  let titleHits = 0;
  for (const token of titleTokens) if (questionTokens.has(token)) titleHits += 1;

  const coverage = hits / Math.sqrt(bodyTokens.length);
  return Number((coverage + titleHits).toFixed(4));
}

export function retrieve(corpus: readonly CorpusEntry[], question: string, limit = 3): Passage[] {
  const tokens = new Set(tokenise(question));
  if (tokens.size === 0) return [];

  return corpus
    .map((entry) => ({ id: entry.id, title: entry.title, text: entry.text, score: scorePassage(tokens, entry) }))
    .filter((passage) => passage.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function contextBlock(passages: readonly Passage[]): string {
  if (passages.length === 0) {
    return (
      'No material on this site matches the question. Say that plainly, do not answer from your own ' +
      'knowledge, and point the person at the contact form or the relevant page.'
    );
  }
  const blocks = passages.map(
    (passage, index) => `[${index + 1}] ${passage.title}\n${passage.text}`,
  );
  return `Material from this site that may be relevant:\n\n${blocks.join('\n\n')}`;
}
