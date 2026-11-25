/** Typed API client for ChessScope. */
export interface User {
  id: number;
  email: string;
  display_name: string;
}

export interface GameRow {
  id: number;
  uid: string;
  white: string;
  black: string;
  result: string;
  created_at: string | null;
  analysed: boolean;
}

export interface MoveStat {
  ply: number;
  san: string;
  side: string;
  is_capture: boolean;
  is_check: boolean;
  is_mate: boolean;
  is_castle: boolean;
  is_promotion: boolean;
  captured_value: number | null;
  material_after: number;
  flags: string[];
  engine_eval_cp: number | null;
  eval_drop_cp: number | null;
  classification: string | null;
}

export interface Analysis {
  headers: Record<string, string>;
  result: string;
  stats: {
    plies: number;
    captures: number;
    checks: number;
    castles: number;
    promotions: number;
    final_material_balance: number;
    white_moves: number;
    black_moves: number;
  };
  engine: { available: boolean; name: string | null; depth: number | null; message: string };
  flags_summary: Record<string, number>;
  disclaimer: string;
  moves: MoveStat[];
}

export interface Insights {
  games: number;
  results: { white_wins: number; black_wins: number; draws: number; unterminated: number };
  openings: [string, number][];
  heuristic_flags_total: number;
  engine_available: boolean;
  disclaimer: string;
}

export interface Mistake {
  id: number;
  gameId: number;
  pgnText: string;
  ply: number;
  san: string;
  classification: string;
  evalDropCp: number;
  phase: string;
  category: string;
  createdAt: string;
}

export interface TrainingPlan {
  totalMistakes: number;
  byClassification: Record<string, number>;
  byCategory: Record<string, number>;
  focusAreas: { category: string; title: string; advice: string; count: number; phases: string[] }[];
  note: string;
  progress: Record<string, unknown>;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', ...init });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (typeof body.detail === 'string') message = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

function json(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export const api = {
  me: () => request<User>('/api/auth/me'),
  login: (email: string, password: string) => request<User>('/api/auth/login', json({ email, password })),
  register: (email: string, password: string, display_name: string) =>
    request<User>('/api/auth/register', json({ email, password, display_name })),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  games: () => request<GameRow[]>('/api/games'),
  uploadGame: (pgn_text: string) => request<GameRow>('/api/games', json({ pgn_text })),
  game: (id: number) =>
    request<GameRow & { headers: Record<string, string>; pgn_text: string; analysis: Analysis | null; disclaimer: string }>(
      `/api/games/${id}`,
    ),
  analyze: (id: number) => request<Analysis>(`/api/games/${id}/analyze`, { method: 'POST' }),
  deleteGame: (id: number) => request<{ ok: boolean }>(`/api/games/${id}`, { method: 'DELETE' }),
  insights: () => request<Insights>('/api/insights'),
  trainingMistakes: () => request<{ mistakes: Mistake[] }>('/api/training/mistakes'),
  trainingPlan: () => request<TrainingPlan>('/api/training/plan'),
};

export interface OpeningProvenance {
  line_source: string;
  line_license: string;
  line_url: string;
  line_commit: string;
  explanation_source: string | null;
  explanation_license: string | null;
}
export interface OpeningNote {
  structure: string;
  white_plan: string;
  black_plan: string;
  pitfalls: string;
}
export interface OpeningRecord {
  id: number;
  eco: string;
  name: string;
  plies: number;
  san: string[];
  uci: string[];
  fen: string;
  has_explanation: boolean;
  explanation?: OpeningNote | null;
  provenance: OpeningProvenance;
}
export interface ExploreResult {
  fen: string;
  turn: 'white' | 'black';
  position_names: { id: number; eco: string; name: string }[];
  moves: { uci: string; san: string; lines: number; example: { id: number; eco: string; name: string } }[];
  provenance: OpeningProvenance;
}
export interface OpeningCardView {
  id: number;
  opening_id: number;
  side: 'white' | 'black';
  eco: string;
  name: string;
  plies: number;
  reps: number;
  lapses: number;
  stability_days: number;
  due_at: string;
  due: boolean;
  recall_estimate: number | null;
  recall_note: string;
}
export interface ReviewResult {
  correct: boolean;
  first_error_index: number | null;
  expected: string[];
  line_san: string[];
  opening: OpeningRecord;
  card: OpeningCardView;
}
export interface GameOpening {
  match: { opening: OpeningRecord; matched_plies: number; left_book_at_ply: number | null } | null;
  linked_mistakes: { ply: number; san: string; classification: string }[];
  note: string;
}

export const openingsApi = {
  search: (q: string, eco = '') =>
    request<{ meta: Record<string, string>; results: OpeningRecord[] }>(
      `/api/openings?q=${encodeURIComponent(q)}&eco=${encodeURIComponent(eco)}`,
    ),
  explore: (moves: string[]) => request<ExploreResult>(`/api/openings/explore?moves=${encodeURIComponent(moves.join(','))}`),
  detail: (id: number) => request<OpeningRecord>(`/api/openings/${id}`),
  cards: () => request<{ cards: OpeningCardView[] }>('/api/openings/cards'),
  addCard: (opening_id: number, side: 'white' | 'black') =>
    request<OpeningCardView>('/api/openings/cards', json({ opening_id, side })),
  deleteCard: (id: number) => request<{ ok: boolean }>(`/api/openings/cards/${id}`, { method: 'DELETE' }),
  drill: (id: number) =>
    request<{ card: OpeningCardView; user_moves: number; opponent_moves: string[] }>(`/api/openings/cards/${id}/drill`),
  review: (id: number, moves: string[]) => request<ReviewResult>(`/api/openings/cards/${id}/review`, json({ moves })),
  gameOpening: (gameId: number) => request<GameOpening>(`/api/games/${gameId}/opening`),
};
