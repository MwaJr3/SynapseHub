export interface User {
  id: number;
  email: string;
  is_admin: boolean;
}

export interface Session {
  token: string;
  user: User;
}

export interface Health {
  status: string;
  pipeline: string;
  engines: {
    dsp: boolean;
    demucs: boolean;
    demucs_note: string;
    crepe: boolean;
    crepe_note: string;
    ffmpeg: boolean;
  };
  retention_days: number;
}

export interface ProjectSummary {
  id: number;
  title: string;
  created_at: string;
  audio_files: number;
  jobs: number;
  stems: number;
}

export interface AudioMeta {
  format?: string;
  subtype?: string;
  sample_rate?: number;
  channels?: number;
  frames?: number;
  duration?: number;
  codec?: string;
  sniffed_format?: string;
  size_bytes?: number;
  [key: string]: unknown;
}

export interface JobSummary {
  id: number;
  state: string;
  progress: number;
  message: string;
  model: string;
  model_version: string;
  config: Record<string, unknown>;
  created_at: string | null;
  finished_at: string | null;
  error: string | null;
  warnings: string[];
  queue?: string;
  estimated_processing_time?: string;
}

export interface AudioFileRecord {
  id: number;
  filename: string;
  meta: AudioMeta;
  size_bytes: number;
  jobs: JobSummary[];
}

export interface ProjectDetail {
  id: number;
  title: string;
  audio_files: AudioFileRecord[];
}

export interface JobStage {
  name: string;
  state: string;
  progress: number;
  message: string;
  duration_s?: number;
}

export interface JobDetail extends JobSummary {
  stages: JobStage[];
}

export interface StemQuality {
  stem?: string;
  quality?: string;
  rms_dbfs?: number;
  peak?: number;
  silence_ratio?: number;
  clipped_ratio?: number;
  bleed_proxy?: number;
  energy_share?: number;
  warnings?: string[];
  waveform?: number[];
  [key: string]: unknown;
}

export interface Stem {
  id: number;
  name: string;
  kind: 'original' | 'music' | 'derived' | 'voice_part' | 'minus_one' | string;
  voice_id: string;
  user_label: string;
  quality: StemQuality;
  stream_url: string;
  download_url: string;
}

export interface VoicePrediction {
  class: string;
  probability: number;
}

/** How much of a line sits inside one of the six standard vocal ranges. */
export interface ChartFit {
  class: string;
  lowest_note: string;
  highest_note: string;
  within_range_ratio: number;
}

export interface Voice {
  voice_id: string;
  is_lead?: boolean;
  stem_note?: string;
  chart_fit?: ChartFit[];
  role: string;
  classification: string;
  user_classification: string;
  confidence: number;
  predicted?: string;
  confidence_label?: string;
  predictions?: VoicePrediction[];
  range?: {
    lowest_midi: number;
    highest_midi: number;
    lowest_note: string;
    highest_note: string;
  };
  pitch_statistics?: {
    median_midi: number;
    mean_midi: number;
    p10_midi: number;
    p90_midi: number;
  };
  voiced_seconds?: number;
  stem_available?: boolean;
  stem_unavailable_reason?: string | null;
}

export interface ProcessingReport {
  input?: AudioMeta & { filename?: string };
  pipeline?: string;
  detected_sources?: string[];
  separation?: Record<string, unknown>;
  voice_analysis?: Record<string, unknown>;
  voice_outcome?: { code: string; message: string };
  lead_split_outcome?: { code: string; message: string };
  reconstruction?: {
    residual_db_below_mix?: number | null;
    sample_aligned?: boolean;
    note?: string;
  };
  warnings?: string[];
  processing_time?: number;
  [key: string]: unknown;
}

export interface JobResults extends JobSummary {
  audio_file: { filename: string; meta: AudioMeta };
  stems: Stem[];
  voices: Voice[];
  report: ProcessingReport;
}

export interface PitchPoint {
  time: number;
  midi: number;
  frequency: number;
  note: string;
  confidence: number;
}

export type PitchData =
  | Record<string, PitchPoint[]>
  | { pitch_tracks: Record<string, PitchPoint[]> };

export interface ModelRecord {
  name: string;
  version: string;
  provider: string;
  license: string;
  supported_sources: string[];
  gpu_required: boolean;
  enabled: boolean;
  available: boolean;
  availability_note: string;
  meta: Record<string, unknown>;
}

export interface UploadResponse {
  audio_file_id: number;
  filename: string;
  meta: AudioMeta;
  duplicate_of_existing: boolean;
  notice: string;
}

export type ExportFormat = 'WAV' | 'FLAC' | 'MP3';
