/** Typed API client. Every call is same-origin; cookies carry the session. */
import { eventText, takeSseEvents } from './utils';

export interface Recommendation {
  concept_id: string;
  title: string;
  score: number;
  reasons: string[];
  blocked_by: string[];
  forgetting_risk: number;
  due: boolean;
}

export interface KnowledgeRow {
  concept_id: string;
  title: string;
  subject: string;
  mastery: number;
  retained: number;
  tier: string;
  stability_days: number | null;
  next_review_at: string | null;
  due?: boolean;
  reps: number;
  lapses: number;
}

export interface SubjectGroup {
  subject: string;
  average_mastery: number;
  concepts: KnowledgeRow[];
}

export interface SessionItem {
  kind: 'new_concept' | 'review' | 'weak_area';
  concept_id: string;
  title: string;
  minutes: number;
  reasons: string[];
}

export interface TodayResponse {
  available_minutes: number;
  items: SessionItem[];
  empty_state: string | null;
}

export interface Provenance {
  title: string;
  author: string;
  url: string;
  license_class: string;
  license_name: string;
  attribution: string;
  retrieved_at: string;
}

export interface QuestionView {
  id: string;
  prompt: string;
  choices: string[];
  difficulty: number;
}

export interface ConceptDetail {
  concept: {
    id: string;
    title: string;
    subject: string;
    summary: string;
    explanation: string;
    difficulty: number;
  };
  lesson: {
    id: string;
    title: string;
    hook: string;
    explanation: string;
    example: string;
    application: string;
    recap: string;
    est_minutes: number;
  } | null;
  provenance: Provenance | null;
  state: { mastery: number; tier: string; stability_days: number; reps: number; lapses: number } | null;
  prerequisites: { concept_id: string; relation: string }[];
  questions: QuestionView[];
}

export interface AnswerResult {
  concept_id: string;
  correct: boolean;
  mastery: number;
  mastery_delta: number;
  tier: string;
  retrievability_before: number;
  interval_days: number;
  next_review_at: string;
  explanation: string;
  correct_index: number;
  misconception: string | null;
}

export interface MapNode {
  id: string;
  title: string;
  subject: string;
  difficulty: number;
  mastery: number;
  tier: string;
}

export interface MapEdge {
  from: string;
  to: string;
  relation: string;
}

export interface PuzzleSummary {
  id: string;
  title: string;
  theme: string;
  difficulty: number;
  side_to_move: string;
}

export interface PuzzleView {
  id: string;
  title: string;
  theme: string;
  difficulty: number;
  board: {
    fen: string;
    side_to_move: string;
    in_check: boolean;
    plies_played: number;
    legal_moves: string[];
  };
}

export interface MoveResult {
  legal: boolean;
  on_solution: boolean;
  solved: boolean;
  fen: string;
  plies_played: number;
  san_history: string[];
  opponent_reply: string | null;
  error: string | null;
}

export interface SourceRow {
  source_id: string;
  title: string;
  author: string;
  url: string;
  license_class: string;
  license_name: string;
  attribution: string;
  retrieved_at: string;
  usage: string;
  reason: string;
  commercial_deployment: boolean;
}

export interface OpeningSummary {
  id: string;
  eco: string;
  name: string;
  family: string;
  moves_san: string;
  moves_uci: string;
  idea: string;
  plies: number;
}

export interface OpeningsResponse {
  openings: OpeningSummary[];
  families: Record<string, number>;
}

export interface OpeningMatch {
  eco: string;
  name: string;
  family: string;
  moves_san: string;
}

export interface OpeningMatchResponse {
  matched: boolean;
  matches: OpeningMatch[];
  message: string | null;
}

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  created_at: string;
  citations: { title: string; citation: string; source_url: string | null; license_name: string | null }[];
}

export interface TutorThread {
  id: string;
  title: string;
  created_at: string;
  message_count: number;
}

export interface TutorStatus {
  configured: boolean;
  model: string;
  provider: string;
  base_url: string;
  key_source: string | null;
  missing: string[];
  reason: string;
  retrieval_available: boolean;
  note: string;
}

export interface TutorPassage {
  concept_id: string;
  concept_title: string;
  subject: string;
  text: string;
  citation: string;
  source_url: string;
  license_name: string;
}

export interface TutorSearchResponse {
  mode: 'retrieval';
  generated: false;
  passages: TutorPassage[];
  message: string | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ChatHandlers {
  onDelta: (text: string) => void;
  onCitations: (citations: TutorMessage['citations']) => void;
  onError: (message: string, retryable: boolean) => void;
  onDone: (threadId: string) => void;
}

/**
 * Stream one tutor turn.
 *
 * The response is a Server-Sent Event stream from our own backend, read with the
 * browser's own fetch and a reader loop — no vendor script, no iframe, no CDN.
 * A 503 means the deployment has no model configured; that is surfaced as an
 * error rather than retried in a loop.
 */
export async function streamTutorChat(
  body: { message: string; threadId: string | null },
  handlers: ChatHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch('/api/tutor/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    credentials: 'same-origin',
    body: JSON.stringify({ message: body.message, thread_id: body.threadId }),
    signal,
  });

  if (!response.ok || !response.body) {
    let message = `The tutor is unavailable (${response.status}).`;
    try {
      const payload = (await response.json()) as { reason?: unknown };
      if (typeof payload.reason === 'string') message = payload.reason;
    } catch {
      // Non-JSON error body: the status is all we know.
    }
    handlers.onError(message, false);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parsed = takeSseEvents(buffer);
    buffer = parsed.rest;
    for (const event of parsed.events) {
      if (event.name === 'delta') {
        handlers.onDelta(eventText(event.data, 'text'));
      } else if (event.name === 'citations') {
        const raw = event.data.citations;
        if (Array.isArray(raw)) handlers.onCitations(raw as TutorMessage['citations']);
      } else if (event.name === 'error') {
        handlers.onError(eventText(event.data, 'message'), event.data.retryable === true);
      } else if (event.name === 'done') {
        handlers.onDone(eventText(event.data, 'thread_id'));
      }
    }
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'same-origin',
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === 'string') message = body.detail;
    } catch {
      // Non-JSON error body: the status is all we know.
    }
    throw new ApiError(message, response.status);
  }
  return (await response.json()) as T;
}

export const api = {
  me: () => request<{ email: string; display_name: string }>('/api/auth/me'),
  register: (email: string, password: string, displayName: string) =>
    request<{ email: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name: displayName }),
    }),
  login: (email: string, password: string) =>
    request<{ email: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ message: string }>('/api/auth/logout', { method: 'POST' }),

  today: (minutes: number) => request<TodayResponse>(`/api/today?available_minutes=${minutes}`),
  knowledge: () => request<{ concepts: KnowledgeRow[]; subjects: SubjectGroup[] }>('/api/knowledge'),
  map: () => request<{ nodes: MapNode[]; edges: MapEdge[] }>('/api/map'),
  recommendations: () =>
    request<{ next: Recommendation[]; review_queue: Recommendation[]; weaknesses: Recommendation[] }>(
      '/api/recommendations',
    ),
  concept: (id: string) => request<ConceptDetail>(`/api/concepts/${encodeURIComponent(id)}`),
  answer: (questionId: string, choiceIndex: number, confidence: number, latencyMs: number) =>
    request<AnswerResult>('/api/answers', {
      method: 'POST',
      body: JSON.stringify({
        question_id: questionId,
        choice_index: choiceIndex,
        confidence,
        latency_ms: latencyMs,
      }),
    }),
  sources: () => request<{ sources: SourceRow[] }>('/api/sources'),

  puzzles: () => request<{ puzzles: PuzzleSummary[] }>('/api/chess/puzzles'),
  openings: (family?: string) =>
    request<OpeningsResponse>(
      family ? `/api/chess/openings?family=${encodeURIComponent(family)}` : '/api/chess/openings',
    ),
  openingMatchByMoves: (uciMoves: string[]) =>
    request<OpeningMatchResponse>(`/api/chess/openings/match?moves=${encodeURIComponent(uciMoves.join(' '))}`),

  tutorStatus: () => request<TutorStatus>('/api/tutor/status'),
  tutorThreads: () => request<{ threads: TutorThread[] }>('/api/tutor/threads'),
  tutorThread: (id: string) =>
    request<{ thread: TutorThread; messages: TutorMessage[] }>(`/api/tutor/threads/${encodeURIComponent(id)}`),
  deleteTutorThread: (id: string) =>
    request<{ deleted: string }>(`/api/tutor/threads/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  tutorSearch: (question: string, limit = 4) =>
    request<TutorSearchResponse>('/api/tutor/search', {
      method: 'POST',
      body: JSON.stringify({ question, limit }),
    }),

  puzzle: (id: string) => request<PuzzleView>(`/api/chess/puzzles/${encodeURIComponent(id)}`),
  move: (id: string, uci: string, pliesPlayed: number) =>
    request<MoveResult>(`/api/chess/puzzles/${encodeURIComponent(id)}/move`, {
      method: 'POST',
      body: JSON.stringify({ uci, plies_played: pliesPlayed }),
    }),
};
