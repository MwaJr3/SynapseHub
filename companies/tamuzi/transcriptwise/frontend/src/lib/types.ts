export type Theme = 'light' | 'dark' | 'system'
export type Level = 'beginner' | 'intermediate' | 'advanced'
export type Depth = 'quick' | 'standard' | 'comprehensive'
export interface Preferences {
  theme?: Theme
  level?: Level
  depth?: Depth
  output_language?: string
}
export interface SessionInfo {
  user: {
    id: string
    email: string | null
    display_name: string
    is_guest: boolean
    preferences: Preferences
    expires_at: string | null
  }
  csrf_token: string
  capabilities: {
    ai_provider: 'local' | 'openai_compatible'
    ai_model: string | null
    youtube_authorized: boolean
    max_upload_bytes: number
    max_transcript_chars: number
    guest_retention_days: number
    unsaved_retention_days: number
    external_research: boolean
  }
}
export interface Segment {
  id: string
  text: string
  start: number | null
  end: number | null
}
export interface Transcript {
  id: string
  title: string
  source_type: 'paste' | 'upload' | 'youtube'
  source_url: string | null
  video_id: string | null
  metadata: {
    title?: string
    channel?: string
    thumbnail_url?: string
    availability?: string
    notice?: string
    filename?: string
    retrieval_method?: string
  }
  language: string | null
  text: string
  original_text: string
  segments: Segment[]
  original_segments: Segment[]
  version: number
  created_at: string
}
export interface AnalysisConfig {
  objective: string
  level: Level
  depth: Depth
  output_language: string
  include_quiz: boolean
  include_flashcards: boolean
  include_exercises: boolean
  include_limitations: boolean
  instructions: string
}
export type SectionKey =
  | 'overview'
  | 'takeaways'
  | 'notes'
  | 'concepts'
  | 'procedures'
  | 'evidence'
  | 'actions'
  | 'applications'
  | 'quotes'
  | 'limitations'
  | 'plan'
  | 'prerequisites'
  | 'research'
export type Provenance =
  | 'source_claim'
  | 'source_paraphrase'
  | 'direct_quote'
  | 'ai_explanation'
  | 'illustrative_example'
  | 'recommendation'
  | 'inferred_prerequisite'
  | 'user_note'
export interface LearningItem {
  id: string
  heading: string
  body: string
  provenance: Provenance
  refs: string[]
  details: { label: string; text: string }[]
}
export interface GuideSection {
  key: SectionKey
  title: string
  items: LearningItem[]
}
export interface Question {
  id: string
  kind: 'multiple_choice' | 'true_false' | 'short_answer' | 'application'
  question: string
  options: string[]
  answer: string
  explanation: string
  refs: string[]
}
export interface Flashcard {
  id: string
  front: string
  back: string
  refs: string[]
  difficulty: 'easy' | 'medium' | 'hard'
}
export interface StudyCard extends Flashcard {
  analysis_id: string
  guide_title: string
  due?: boolean
  due_at?: string | null
  last_rating?: string | null
}
export interface Guide {
  title: string
  sections: GuideSection[]
  quiz: Question[]
  flashcards: Flashcard[]
  notices: string[]
  _meta: {
    engine: string
    prompt_version: string
    chunks: number
    processed_chunks: number
    source_segments: number
    processed_segments: number
    partial: boolean
  }
}
export interface Task {
  id: string
  analysis_id: string | null
  kind: 'analyze' | 'regenerate' | 'retrieve'
  status: 'queued' | 'processing' | 'complete' | 'failed'
  message: string
  error_code: string | null
  completed_units: number
  total_units: number
  created_at: string
  result: {
    analysis_id?: string
    transcript_id?: string
    metadata?: Transcript['metadata']
    available_languages?: string[]
    source_url?: string
    video_id?: string
  } | null
}
export interface Analysis {
  id: string
  transcript_id: string
  title: string
  config: AnalysisConfig
  status: 'queued' | 'processing' | 'complete' | 'partial' | 'failed'
  error: string | null
  is_saved: boolean
  folder: string
  tags: string[]
  revision: number
  created_at: string
  updated_at: string
  guide: Guide | null
  notes: string
  processed_chunks: number
  task?: Task | null
}
export interface LibraryItem extends Omit<Analysis, 'guide' | 'notes' | 'processed_chunks'> {
  source_type: Transcript['source_type']
  channel?: string
  card_count: number
  section_count: number
}
export interface LibraryResponse {
  items: LibraryItem[]
  total: number
  folders: string[]
  tags: string[]
}
export interface Stats {
  guides: number
  saved: number
  quizzes_completed: number
  cards_reviewed: number
}
export interface QuizResult {
  id: string
  score: number | null
  objective_count: number
  correct_count: number
  notice: string
  questions: {
    id: string
    question: string
    submitted: string
    correct: boolean | null
    answer: string
    explanation: string
    refs: string[]
  }[]
  created_at: string
}
