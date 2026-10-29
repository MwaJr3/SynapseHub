export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const d = new Date(hasZone ? value : `${value}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DAY = 86_400_000;

/** "now", "5m ago", "2h ago", "yesterday", "3d ago", then "Oct 3" / "Oct 3, 2024". */
export function relativeTime(value: string | null | undefined, now: number = Date.now()): string {
  const d = parseDate(value);
  if (!d) return 'No date';
  const diff = now - d.getTime();
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h ago`;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.floor((startOfToday.getTime() - new Date(d).setHours(0, 0, 0, 0)) / DAY);
  if (days <= 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString(undefined, sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fullDate(value: string | null | undefined): string {
  const d = parseDate(value);
  return d ? d.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' }) : 'No publication date in this feed';
}

export function shortDate(value: string | null | undefined): string {
  const d = parseDate(value);
  return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
}

/** Navigation badges stop at 99+ so counts never become a source of anxiety. */
export function badge(count: number): string {
  return count > 99 ? '99+' : String(count);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

export function hostname(url: string | null | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Splits text on the search terms so matches can be wrapped in <mark>. */
export function highlightParts(text: string, query: string): { text: string; match: boolean }[] {
  const terms = query.split(/\s+/).map((t) => t.trim()).filter(Boolean).slice(0, 6);
  if (!terms.length || !text) return [{ text, match: false }];
  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  // With one capture group, split() puts every match at an odd index.
  return text.split(pattern).map((part, i) => ({ text: part, match: i % 2 === 1 })).filter((p) => p.text !== '');
}

const HUES = [217, 262, 340, 24, 160, 190, 48, 290];
export function hueFor(id: number | string): number {
  const n = typeof id === 'number' ? id : [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return HUES[Math.abs(n) % HUES.length] ?? 217;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}
