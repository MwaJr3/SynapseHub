import type { Stem } from '../types';

export const VOICE_PARTS = [
  'soprano',
  'alto',
  'contralto',
  'tenor',
  'baritone',
  'bass_baritone',
  'bass',
  'unknown',
] as const;

const STEM_ORDER: Record<string, number> = {
  original: 0,
  vocals: 10,
  instrumental: 20,
  drums: 30,
  bass: 40,
  piano: 50,
  guitar: 60,
  other: 70,
  soprano: 100,
  alto: 110,
  contralto: 120,
  tenor: 130,
  baritone: 140,
  bass_baritone: 150,
  bass_voice: 160,
};

export function sortStems(stems: Stem[]): Stem[] {
  return [...stems].sort((a, b) => {
    const av = STEM_ORDER[a.name] ?? (a.kind === 'voice_part' ? 170 : 80);
    const bv = STEM_ORDER[b.name] ?? (b.kind === 'voice_part' ? 170 : 80);
    return av - bv || a.name.localeCompare(b.name) || a.id - b.id;
  });
}

export function prettyName(name: string): string {
  const special: Record<string, string> = {
    bass_baritone: 'Bass-baritone',
  };
  return (
    special[name] ??
    name
      .replace(/^voice_(\d+)$/, 'Voice $1')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

export function formatTime(seconds: number | undefined | null): string {
  if (!Number.isFinite(seconds) || seconds === null || seconds === undefined) return '0:00';
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = Math.floor(safe % 60);
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export function formatBytes(bytes: number | undefined): string {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function percent(value: number | undefined, digits = 0): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

export function confidenceClass(value: number): string {
  if (value >= 0.9) return 'confidence-high';
  if (value >= 0.75) return 'confidence-good';
  if (value >= 0.6) return 'confidence-moderate';
  if (value >= 0.4) return 'confidence-low';
  return 'confidence-unreliable';
}

export function confidenceText(value: number, supplied?: string): string {
  if (supplied) return supplied;
  if (value >= 0.9) return 'High confidence';
  if (value >= 0.75) return 'Good confidence';
  if (value >= 0.6) return 'Moderate confidence';
  if (value >= 0.4) return 'Low confidence';
  return 'Unreliable';
}

export function withDownloadFormat(url: string, format: 'wav' | 'mp3' | 'flac'): string {
  if (format === 'wav') return url;
  return `${url}${url.includes('?') ? '&' : '?'}format=${format}`;
}

export function dateText(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
