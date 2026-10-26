const KEY = 'fp-recent-searches';

export function getRecent(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string').slice(0, 6) : [];
  } catch {
    return [];
  }
}

export function pushRecent(q: string): string[] {
  const term = q.trim();
  if (term.length < 2) return getRecent();
  const next = [term, ...getRecent().filter((x) => x.toLowerCase() !== term.toLowerCase())].slice(0, 6);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  return next;
}

export function clearRecent() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
