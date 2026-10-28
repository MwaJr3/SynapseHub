/** Typed API client. Every call is same-origin; cookies carry the session. */
import { eventText, takeSseEvents } from './utils';

/* ------------------------------------------------------------ learner profile */

export interface CoreAxisScore {
  axis: string;
  name: string;
  value: number | null;
  value_label: string;
  note: string;
  scale_min: number;
  scale_max: number;
  instrument: string;
  instrument_label: string;
  reported_by: string;
  administered_on: string;
  assessment_id: string;
}

export interface CoreAxis {
  axis: string;
  name: string;
  label: string;
  //: True when no score was ever supplied. Distinct from a score of zero.
  missing: boolean;
  score: CoreAxisScore | null;
}

export interface AssessmentScore {
  axis: string;
  name: string;
  value: number | null;
  value_label: string;
  note: string;
}

export interface Assessment {
  id: string;
  instrument: string;
  instrument_label: string;
  label: string;
  reported_by: string;
  source_url: string;
  source_note: string;
  administered_on: string;
  scale_min: number;
  scale_max: number;
  archived: boolean;
  archive_reason: string;
  //: The submission this one replaces, and the one that replaced it. Null when
  //: there is no such row; never inferred on the client.
  supersedes_id: string | null;
  replaced_by: string | null;
  created_at: string;
  scores: AssessmentScore[];
}

export interface InstrumentAxis {
  axis: string;
  name: string;
  label: string;
}

export interface Instrument {
  id: string;
  label: string;
  value_kind: 'number' | 'label';
  scale_min: number | null;
  scale_max: number | null;
  note: string;
  axes: InstrumentAxis[];
}

export interface ProfileResponse {
  learner: { email: string; display_name: string };
  context: string;
  updated_at: string | null;
  axes: CoreAxis[];
  missing: string[];
  assessments: Assessment[];
  instruments: Instrument[];
  caveats: string[];
}

export interface AssessmentInput {
  instrument: string;
  label?: string;
  reported_by?: string;
  source_url?: string;
  source_note?: string;
  administered_on?: string;
  scores: AssessmentScore[];
}

/* ------------------------------------------------------------- competency */

export type CompetencyVerdict = 'no_evidence' | 'emerging' | 'developing' | 'secure';

export interface CompetencyEvidence {
  observations: number;
  auto: number;
  self: number;
  effective: number;
  //: Null, never 0, when nothing has been observed. The distinction is the point.
  score: number | null;
  confidence: number;
  recent_score: number | null;
  last_observed_at: string | null;
  first_observed_at: string | null;
  formats: Record<string, { attempts: number; mean_score: number }>;
}

export interface CompetencyMastery {
  value: number;
  retained: number;
  scale_min: number;
  scale_max: number;
  tier: string;
  reps: number;
  lapses: number;
  stability_days: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  source: string;
}

export interface CompetencyDisagreement {
  contested: boolean;
  gap: number;
  direction: 'optimistic' | 'conservative';
  reason: string;
}

export interface CompetencyAxisGap {
  axis: string;
  name: string;
  label: string;
  instrument: string | null;
}

export interface CompetencyGap {
  kind: string;
  severity: number;
  reason: string;
  action: string;
  type: 'concept' | 'axis' | 'axes';
  concept_id?: string | null;
  label?: string;
  axis?: string;
  name?: string;
  instrument?: string | null;
  assessment_id?: string | null;
  axes?: CompetencyAxisGap[];
}

export interface CompetencyRow {
  concept_id: string;
  title: string;
  subject: string;
  verdict: CompetencyVerdict;
  verdict_reason: string;
  evidence: CompetencyEvidence;
  mastery: CompetencyMastery | null;
  disagreement: CompetencyDisagreement | null;
  gaps: CompetencyGap[];
  primary_gap: CompetencyGap | null;
}

export interface CompetencyCalibration {
  answered: number;
  accuracy: number | null;
  mean_confidence: number | null;
  overconfidence: number | null;
  buckets: { confidence: number; answered: number; accuracy: number }[];
  reason: string;
}

export interface CompetencyOverview {
  as_of: string;
  policy: string;
  thresholds: {
    half_life_days: number;
    secure_min_effective: number;
    secure_min_score: number;
    developing_min_effective: number;
    developing_min_score: number;
    disagreement_gap: number;
  };
  counts: {
    concepts: number;
    with_evidence: number;
    without_evidence: number;
    observations: number;
    server_graded: number;
    self_graded: number;
  };
  verdicts: Record<CompetencyVerdict, number>;
  coverage_note: string;
  calibration: CompetencyCalibration;
  gaps: CompetencyGap[];
  gaps_total: number;
  concepts: CompetencyRow[];
}

export interface CompetencyObservation {
  id: string;
  source: 'quiz' | 'retrieval';
  format: string;
  score: number;
  weight: number;
  graded_by: 'auto' | 'self';
  at: string;
  recency: number;
}

export interface CompetencyDetail extends CompetencyRow {
  observation_log: CompetencyObservation[];
  what_would_change_it: string[];
  next_interval_days: number | null;
}

/* ----------------------------------------------------------- reassessment */

export interface ReassessInput {
  label?: string;
  reported_by?: string;
  source_url?: string;
  source_note?: string;
  administered_on?: string;
  scale_min?: number;
  scale_max?: number;
  scores: AssessmentScore[];
}

export type DiffDirection = 'up' | 'down' | 'same' | 'new' | 'missing' | 'not_supplied';

export interface AssessmentDiffRow {
  axis: string;
  name: string;
  previous: number | null;
  value: number | null;
  //: Null whenever either side did not supply a number.
  delta: number | null;
  previous_label: string;
  new_label: string;
  direction: DiffDirection;
}

export interface AssessmentDiffSummary {
  axes: number;
  moved: number;
  up: number;
  down: number;
  unchanged: number;
  newly_supplied: number;
  withdrawn: number;
  missing: number;
  comparable: number;
  mean_delta: number | null;
  note: string;
}

export interface ReassessmentResult {
  assessment: Assessment;
  previous: Assessment;
  diff: AssessmentDiffRow[];
  summary: AssessmentDiffSummary;
}

export interface AssessmentHistory {
  instrument: string;
  current_id: string;
  submissions: {
    assessment: Assessment;
    diff: AssessmentDiffRow[];
    summary: AssessmentDiffSummary | null;
  }[];
  note: string;
}

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
    /**
     * The parsed `detail` field, when the server sent a structured one. A few
     * endpoints return `{message, current_id}` so the client can offer the next
     * step instead of only saying "conflict".
     */
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Trace entries, validated rather than trusted from the wire. */
export function parseSteps(payload: Record<string, unknown>): { label: string; detail: string; ok: boolean }[] {
  const raw = payload.steps;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const label = (entry as { label?: unknown }).label;
    const detail = (entry as { detail?: unknown }).detail;
    const ok = (entry as { ok?: unknown }).ok;
    if (typeof label !== 'string' || typeof detail !== 'string') return [];
    return [{ label, detail, ok: ok !== false }];
  });
}

export interface ChatHandlers {
  onStep: (steps: { label: string; detail: string; ok: boolean }[]) => void;
  onDelta: (text: string) => void;
  onCitations: (citations: TutorMessage['citations']) => void;
  onError: (message: string, retryable: boolean) => void;
  onDone: (threadId: string, grounded: boolean) => void;
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
      if (event.name === 'step') {
        handlers.onStep(parseSteps(event.data));
      } else if (event.name === 'delta') {
        handlers.onDelta(eventText(event.data, 'text'));
      } else if (event.name === 'citations') {
        const raw = event.data.citations;
        if (Array.isArray(raw)) handlers.onCitations(raw as TutorMessage['citations']);
      } else if (event.name === 'error') {
        handlers.onError(eventText(event.data, 'message'), event.data.retryable === true);
      } else if (event.name === 'done') {
        handlers.onDone(eventText(event.data, 'thread_id'), event.data.grounded !== false);
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
    let detail: unknown;
    try {
      const body = (await response.json()) as { detail?: unknown };
      detail = body.detail;
      if (typeof detail === 'string') {
        message = detail;
      } else if (
        detail &&
        typeof detail === 'object' &&
        typeof (detail as { message?: unknown }).message === 'string'
      ) {
        message = (detail as { message: string }).message;
      }
    } catch {
      // Non-JSON error body: the status is all we know.
    }
    throw new ApiError(message, response.status, detail);
  }
  return (await response.json()) as T;
}


/* ------------------------------------------------- learner's own material */

export interface OwnConcept {
  id: string;
  title: string;
  subject: string;
  summary: string;
  explanation: string;
  difficulty: number;
  own: boolean;
}

export interface RelationType {
  id: string;
  label: string;
  meaning: string;
  //: "true" when the relation gates recommendations rather than just describing.
  gates: string;
}

export interface ActivityType {
  id: string;
  label: string;
}

export interface LibraryStats {
  concepts_own: number;
  notes: number;
  sessions_open: number;
  sessions_finished: number;
  minutes_recorded: number;
  note: string;
}

export interface LibraryResponse {
  concepts: OwnConcept[];
  relations: RelationType[];
  activities: ActivityType[];
  stats: LibraryStats;
}

export interface Relation {
  id: string;
  from_id: string;
  to_id: string;
  from_title: string;
  to_title: string;
  relation: string;
  label: string;
  removable: boolean;
}

export interface Note {
  id: string;
  concept_id: string;
  concept_title: string;
  title: string;
  body: string;
  source_ref: string;
  created_at: string;
  updated_at: string;
  score: number;
  matched: string[];
}

export interface NotesResponse {
  notes: Note[];
  query: string;
  terms: string[];
  explanation: string;
}

export interface SessionActivity {
  stage: string;
  note: string;
}

export type SessionStatus = 'open' | 'completed' | 'partial' | 'abandoned';

export interface LearningSession {
  id: string;
  concept_id: string;
  concept_title: string;
  objective: string;
  stopping_condition: string;
  planned_minutes: number;
  activities: SessionActivity[];
  reflection: string;
  evidence: string;
  status: SessionStatus;
  minutes_spent: number | null;
  started_at: string | null;
  finished_at: string | null;
  covered: string[];
}

export interface SessionsResponse {
  sessions: LearningSession[];
  stats: LibraryStats;
}


/* ------------------------------------------------------- retrieval practice */

export interface ReviewItem {
  concept_id: string;
  title: string;
  subject: string;
  mastery: number;
  tier: string;
  retained: number;
  predicted_recall: number;
  stability_days: number;
  difficulty: number;
  reps: number;
  lapses: number;
  last_reviewed_at: string;
  next_review_at: string;
  overdue_days: number;
  reasons: string[];
  available_formats: PracticeFormat[];
  suggested_format: PracticeFormat | null;
}

export interface RecoveryPlan {
  active: boolean;
  reason: string;
  today_target: number;
  remaining_after_today: number;
  spread_days: number;
  capped_by_learner?: boolean;
}

export interface ReviewQueue {
  due: ReviewItem[];
  today: ReviewItem[];
  overdue_count: number;
  recovery: RecoveryPlan;
  upcoming: { concept_id: string; title: string; next_review_at: string | null; in_hours: number | null }[];
  target_retention: number;
  empty_state: string | null;
  policy: string;
}

export type PracticeFormat = 'multiple_choice' | 'cloze' | 'cued_recall' | 'free_recall';

export interface PracticePrompt {
  prompt_id: string;
  concept_id: string;
  concept_title: string;
  format: PracticeFormat;
  prompt: string;
  choices: string[];
  graded_by: 'auto' | 'self';
  evidence_weight: number;
  instructions: string;
  criteria: string[];
  criteria_hidden: boolean;
  available_formats: PracticeFormat[];
  attempts_on_concept: number;
  suggested_format: PracticeFormat | null;
}

export interface PracticeAttempt {
  id: string;
  concept_id: string;
  concept_title: string;
  format: PracticeFormat;
  prompt: string;
  answer: string;
  expected: string;
  score: number;
  correct: boolean;
  graded_by: 'auto' | 'self';
  evidence_weight: number;
  latency_ms: number;
  session_id: string | null;
  created_at: string;
}

export interface PracticeResult {
  attempt: PracticeAttempt;
  explanation: string;
  model: {
    concept_id: string;
    correct: boolean;
    evidence_weight: number;
    mastery: number;
    mastery_delta: number;
    tier: string;
    stability_days: number;
    interval_days: number;
    retrievability_before: number;
    next_review_at: string;
    reps: number;
    lapses: number;
  };
  next: { next_review_at: string; interval_days: number; reasons: string[] };
}

export interface ReviewStats {
  summary: {
    total: number;
    by_format: {
      format: string;
      attempts: number;
      mean_score: number;
      auto_graded: number;
      self_graded: number;
    }[];
    note: string;
  };
  prediction: { concept_id: string; predicted_recall: number; elapsed_days: number; stability_days: number }[];
  note: string;
}


/* ------------------------------------------------------- study planner connection */

export interface ConsentRequestParams {
  client_id: string;
  redirect_uri: string;
  scope: string;
  state: string;
  code_challenge: string;
  code_challenge_method: string;
}

export interface ConsentPreview {
  client: { id: string; name: string };
  redirect_uri: string;
  scopes: string[];
  purpose: string;
  already_granted: boolean;
  can_write: boolean;
  revocable: boolean;
}

export interface Connection {
  client_id: string;
  client_name: string;
  scopes: string[];
  purpose: string;
  granted_at: string | null;
  last_used_at: string | null;
  expires_at: string | null;
}

export const api = {
  consentPreview: (params: ConsentRequestParams) => {
    const query = new URLSearchParams({
      client_id: params.client_id,
      redirect_uri: params.redirect_uri,
      scope: params.scope,
    });
    return request<ConsentPreview>(`/api/v1/oauth/consent?${query.toString()}`);
  },
  decideConsent: (body: ConsentRequestParams & { decision: 'grant' | 'deny' }) =>
    request<{ redirect_url: string }>('/api/v1/oauth/authorize', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  connections: () => request<{ connections: Connection[] }>('/api/v1/me/consents'),
  disconnect: (clientId: string) =>
    request<{ client_id: string; revoked_tokens: number }>(
      `/api/v1/me/consents/${encodeURIComponent(clientId)}`,
      { method: 'DELETE' },
    ),
  profile: () => request<ProfileResponse>('/api/profile'),
  saveProfileContext: (context: string) =>
    request<{ context: string; updated_at: string }>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ context }),
    }),
  addAssessment: (body: AssessmentInput) =>
    request<Assessment>('/api/profile/assessments', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  archiveAssessment: (id: string, reason: string) =>
    request<Assessment>(`/api/profile/assessments/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  reassessAssessment: (id: string, body: ReassessInput) =>
    request<ReassessmentResult>(`/api/profile/assessments/${encodeURIComponent(id)}/reassess`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  assessmentHistory: (id: string) =>
    request<AssessmentHistory>(`/api/profile/assessments/${encodeURIComponent(id)}/history`),
  loadBaseline: () =>
    request<{ created: Assessment[]; skipped: string[] }>('/api/profile/baseline', { method: 'POST' }),
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
  // ------------------------------------------------- learner development, stage 7
  developmentModel: () => request<DevelopmentModel>('/api/development/model'),
  writeHypothesis: (body: {
    scope: 'dimension' | 'process';
    key: string;
    claim: string;
    rationale?: string;
    support?: string[];
    contradict?: string[];
  }) =>
    request<DevelopmentHypothesis & { confidence_because: string }>(
      '/api/development/model/hypotheses',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  reviewHypothesis: (id: string, status: string, note: string) =>
    request<DevelopmentHypothesis>(
      `/api/development/model/hypotheses/${encodeURIComponent(id)}/review`,
      { method: 'POST', body: JSON.stringify({ status, note }) },
    ),
  developmentCurriculum: () => request<Curriculum>('/api/development/curriculum'),
  studyLesson: (slug: string) =>
    request<{ slug: string; state: Lesson['state'] }>(
      `/api/development/curriculum/${encodeURIComponent(slug)}/study`,
      { method: 'POST' },
    ),
  practiseLesson: (slug: string, note = '') =>
    request<{ slug: string; state: Lesson['state'] }>(
      `/api/development/curriculum/${encodeURIComponent(slug)}/practice`,
      { method: 'POST', body: JSON.stringify({ note }) },
    ),
  submitRetrieval: (slug: string, answer: string, criteriaMet: number[]) =>
    request<RetrievalResult>(`/api/development/curriculum/${encodeURIComponent(slug)}/retrieval`, {
      method: 'POST',
      body: JSON.stringify({ answer, criteria_met: criteriaMet }),
    }),
  developmentBaseline: () => request<BaselineResponse>('/api/development/baseline'),
  recordBaseline: (items: { key: string; answer: string }[], observation: Record<string, unknown>) =>
    request<Baseline>('/api/development/baseline', {
      method: 'POST',
      body: JSON.stringify({ items, observation }),
    }),
  developmentProtocol: () => request<Protocol>('/api/development/protocol'),
  saveProtocol: (sections: Record<string, string>, materialExamples: Record<string, string>) =>
    request<Protocol>('/api/development/protocol', {
      method: 'POST',
      body: JSON.stringify({ sections, material_examples: materialExamples }),
    }),
  developmentExperiments: () =>
    request<{ experiments: Experiment[]; min_sample: number; rule: string }>(
      '/api/development/experiments',
    ),
  createExperiment: (body: {
    technique: string;
    hypothesis: string;
    predicted?: string;
    measure: string;
  }) =>
    request<Experiment>('/api/development/experiments', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  observeExperiment: (id: string, observed: string, outcome: string, sampleSize: number) =>
    request<Experiment>(`/api/development/experiments/${encodeURIComponent(id)}/observe`, {
      method: 'POST',
      body: JSON.stringify({ observed, outcome, sample_size: sampleSize }),
    }),
  developmentGate: () => request<DevelopmentGate>('/api/development/gate'),

  // ------------------------------------------------- the learner's own material
  library: () => request<LibraryResponse>('/api/library'),
  createConcept: (body: {
    title: string;
    subject: string;
    summary?: string;
    explanation?: string;
    difficulty?: number;
  }) => request<OwnConcept>('/api/concepts', { method: 'POST', body: JSON.stringify(body) }),
  deleteConcept: (id: string, confirm = false) =>
    request<{ deleted: string; removed: Record<string, number> }>(
      `/api/concepts/${encodeURIComponent(id)}?confirm=${confirm ? 'true' : 'false'}`,
      { method: 'DELETE' },
    ),
  relations: (conceptId: string) =>
    request<{ relations: Relation[] }>(`/api/concepts/${encodeURIComponent(conceptId)}/relations`),
  relate: (fromId: string, to: string, relation: string) =>
    request<{ id: string; from: string; to: string; relation: string; created: boolean }>(
      `/api/concepts/${encodeURIComponent(fromId)}/relate`,
      { method: 'POST', body: JSON.stringify({ to, relation }) },
    ),
  unrelate: (edgeId: string) =>
    request<{ deleted: string }>(`/api/relations/${encodeURIComponent(edgeId)}`, { method: 'DELETE' }),

  notes: (query = '') => request<NotesResponse>(`/api/notes?q=${encodeURIComponent(query)}`),
  createNote: (body: { concept_id: string; title: string; body: string; source_ref?: string }) =>
    request<Note>('/api/notes', { method: 'POST', body: JSON.stringify(body) }),
  deleteNote: (id: string) =>
    request<{ deleted: string }>(`/api/notes/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  sessions: (status?: SessionStatus) =>
    request<SessionsResponse>(status ? `/api/sessions?status=${status}` : '/api/sessions'),
  startSession: (body: {
    concept_id: string;
    objective: string;
    stopping_condition: string;
    planned_minutes: number;
  }) => request<LearningSession>('/api/sessions', { method: 'POST', body: JSON.stringify(body) }),
  updateSession: (id: string, body: { activities?: SessionActivity[]; reflection?: string }) =>
    request<LearningSession>(`/api/sessions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  finishSession: (
    id: string,
    body: { outcome: 'completed' | 'partial' | 'abandoned'; reflection?: string; minutes_spent?: number },
  ) =>
    request<LearningSession>(`/api/sessions/${encodeURIComponent(id)}/finish`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  // ------------------------------------------------------------ review
  reviewQueue: () => request<ReviewQueue>('/api/review'),
  reviewPrompt: (conceptId: string, format: PracticeFormat, seed = 0, reveal = false) =>
    request<PracticePrompt>(
      `/api/review/${encodeURIComponent(conceptId)}/prompt?format=${format}&seed=${seed}&reveal=${reveal ? 'true' : 'false'}`,
    ),
  submitPractice: (body: {
    prompt_id: string;
    answer?: string;
    choice_index?: number;
    checked?: number[];
    latency_ms?: number;
    session_id?: string;
  }) => request<PracticeResult>('/api/review/attempts', { method: 'POST', body: JSON.stringify(body) }),
  reviewHistory: () => request<{ attempts: PracticeAttempt[] }>('/api/review/attempts'),

  // --------------------------------------------------------- competency
  competency: () => request<CompetencyOverview>('/api/competency'),
  competencyDetail: (conceptId: string) =>
    request<CompetencyDetail>(`/api/competency/${encodeURIComponent(conceptId)}`),
  reviewStats: () => request<ReviewStats>('/api/review/stats'),

  // ------------------------------------------------------------ quests and XP
  quests: () => request<QuestList>('/api/quests'),
  acceptQuest: (slug: string) =>
    request<{ slug: string; state: QuestState }>(`/api/quests/${encodeURIComponent(slug)}/accept`, {
      method: 'POST',
    }),
  completeQuest: (slug: string) =>
    request<{ slug: string; state: QuestState; evidence: QuestEvidence }>(
      `/api/quests/${encodeURIComponent(slug)}/complete`,
      { method: 'POST' },
    ),
  // The key is the caller's promise that this click is one award. Sending it again
  // after a timeout returns the entry that already exists instead of a second one.
  claimQuest: (slug: string, idempotencyKey: string) =>
    request<{ entry: XpEntry; created: boolean; guardrails: Guardrails }>(
      `/api/quests/${encodeURIComponent(slug)}/claim`,
      { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey } },
    ),
  xp: () => request<XpSummary>('/api/xp'),
  xpLedger: (limit = 50) => request<{ entries: XpEntry[]; count: number }>(`/api/xp/ledger?limit=${limit}`),
  season: () => request<SeasonSummary>('/api/seasons/current'),

  // ------------------------------------------------------- account and data
  exportAccount: () => request<AccountExport>('/api/account/export'),
  deletionPreview: () => request<DeletionPreview>('/api/account/delete-preview'),
  // POST rather than DELETE-with-a-body: the password travels in a body, and a
  // proxy that drops it on DELETE would report a success that never happened.
  deleteAccount: (body: { password: string; confirm_email: string }) =>
    request<DeletionResult>('/api/account/delete', { method: 'POST', body: JSON.stringify(body) }),
};

/* ------------------------------------------------------------- quests and XP */

export type QuestState = 'available' | 'accepted' | 'completed' | 'claimed' | 'abandoned';

export interface QuestEvidence {
  have: number;
  need: number;
}

export interface Quest {
  slug: string;
  title: string;
  summary: string;
  kind: string;
  difficulty: number;
  base_xp: number;
  state: QuestState;
  evidence: QuestEvidence;
  concept_ids: string[];
  season_id: string;
  completed_at: string | null;
  claimed_at: string | null;
}

export interface Guardrails {
  minutes_today: number;
  minutes_limit: number;
  xp_today: number;
  xp_cap: number;
  paused: boolean;
  capped: boolean;
  message: string;
  //: Always false. Present so the screen can state the rule instead of implying it.
  absence_penalty: boolean;
}

export interface SeasonWindow {
  id: string;
  name: string;
  theme: string;
  starts_at: string;
  ends_at: string;
}

export interface QuestList {
  season: SeasonWindow;
  quests: Quest[];
  guardrails: Guardrails;
}

export interface XpEntry {
  id: string;
  season_id: string;
  quest_id: string | null;
  xp: number;
  kind: string;
  base_xp: number;
  factors: { difficulty: number; challenge: number; strategic: number; evidence: number };
  reason: string;
  created_at: string | null;
}

export interface XpSummary {
  total: number;
  season_xp: number;
  season_id: string;
  today: Guardrails;
  recent: XpEntry[];
}

export interface SeasonSummary extends SeasonWindow {
  days_remaining: number;
  xp: number;
  guardrails: Guardrails;
}

/* ------------------------------------------------------------- account data */

export interface AccountExport {
  format: string;
  version: number;
  generated_at: string;
  account: { email: string; display_name: string; created_at: string };
  manifest: Record<string, number>;
  rows: number;
  data: Record<string, Record<string, unknown>[]>;
  excluded: { table: string; columns: string[]; reason: string }[];
  not_yours: { tables: string[]; reason: string };
}

export interface DeletionPreview {
  email: string;
  tables: Record<string, number>;
  rows: number;
  kept: { tables: string[]; reason: string };
  statement: string;
}

export interface DeletionResult {
  deleted: boolean;
  rows: Record<string, number>;
  total: number;
  message: string;
}

/* ------------------------------------------------ learner development (stage 7) */

export type Confidence = 'none' | 'low' | 'moderate' | 'high';

export interface DevelopmentSuggestion {
  scope: 'dimension' | 'process';
  key: string;
  claim: string;
  rationale: string;
  support: string[];
  contradict: string[];
  kind: 'claim' | 'question';
}

export interface DevelopmentHypothesis {
  id: string;
  scope: 'dimension' | 'process';
  key: string;
  claim: string;
  rationale: string;
  confidence: Confidence;
  support: string[];
  contradict: string[];
  evidence: { kind: string; count: number }[];
  status: 'open' | 'supported' | 'contradicted';
  review_note: string;
  reviewed_at: string | null;
  created_at: string | null;
}

export interface DevelopmentArea {
  scope: 'dimension' | 'process';
  key: string;
  name: string;
  reported: number | null;
  goal: string;
  //: Null when the instrument never supplied a score. Never zero.
  score: { value: number | null; instrument_label: string; reported_by: string } | null;
  missing: boolean;
  suggestion: DevelopmentSuggestion;
  hypothesis: DevelopmentHypothesis | null;
}

export interface DevelopmentModel {
  caveats: string[];
  confidence_policy: Record<Confidence, string>;
  evidence: Record<string, number>;
  areas: DevelopmentArea[];
}

export interface BaselineItem {
  key: string;
  prompt: string;
  options: string[];
}

export interface Baseline {
  id: string;
  items: { key: string; prompt: string; answer: string }[];
  observation: Record<string, string | number | boolean>;
  summary: string;
  //: Always null. The type says so rather than leaving it to the reader.
  score: null;
  score_note: string;
  created_at: string | null;
}

export interface BaselineResponse {
  baseline: Baseline | null;
  items: BaselineItem[];
  observation_fields: { key: string; label: string }[];
  why_no_score: string;
}

export interface Lesson {
  slug: string;
  title: string;
  group: string;
  group_title: string;
  topics: { key: string; title: string }[];
  model: string;
  when_to_use: string;
  when_not_to_use: string;
  worked_example: string;
  exercise: string;
  judging_results: string;
  traps: string;
  retrieval_check: { question: string; criteria: string[] };
  state: 'not_started' | 'studied' | 'practised' | 'retrieval_passed';
  criteria_met: number[];
  studied_at: string | null;
  practised_at: string | null;
}

export interface NamedMethod {
  name: string;
  status: 'undefined';
  problem: string;
  open_alternative: string;
  note: string;
}

export interface Curriculum {
  lessons: Lesson[];
  progress: {
    total: number;
    practised: number;
    retrieval_passed: number;
    groups: Record<string, { title: string; topics: string[]; lessons: number }>;
  };
  named_methods: NamedMethod[];
  dimensions: { key: string; name: string; reported: number | null; goal: string; practices: string[]; drill: string; caution: string }[];
  processes: { key: string; name: string; reported: number | null; trains: string; drill: string; fails_when: string }[];
}

export interface RetrievalResult {
  slug: string;
  state: Lesson['state'];
  passed: boolean;
  criteria_met: number[];
  criteria_total: number;
  self_assessed: boolean;
  note: string;
  still_open: string[];
}

export interface ProtocolSection {
  key: string;
  label: string;
  text: string;
  missing: boolean;
}

export interface Protocol {
  id: string | null;
  version: number;
  sections: ProtocolSection[];
  material_examples: (ProtocolSection & { guidance: string })[];
  complete: boolean;
  missing: string[];
  updated_at: string | null;
}

export interface Experiment {
  id: string;
  technique: string;
  hypothesis: string;
  predicted: string;
  measure: string;
  sample_size: number;
  observed: string;
  outcome: 'pending' | 'weak_signal' | 'no_change' | 'supported' | 'abandoned';
  created_at: string | null;
  observed_at: string | null;
  caveat: string;
}

export interface GateRequirement {
  key: string;
  label: string;
  done: boolean;
  detail: string;
  missing: string[];
}

export interface DevelopmentGate {
  requirements: GateRequirement[];
  done: number;
  total: number;
  ready: boolean;
  note: string;
}
