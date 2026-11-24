export function flagTone(status: string): string {
  switch (status) {
    case 'open': return 'bg-amber-950 text-amber-300 border border-amber-800';
    case 'actioned': return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    default: return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}

export const FAIRNESS_NOTE =
  'Flags are supportive review signals with visible rules and evidence — never labels of ability or predictions of failure.';

export function readQueryParam(name: string): string {
  try { return new URLSearchParams(window.location.search).get(name) ?? ''; } catch { return ''; }
}

/** Keeps a filter in the URL so a reload or shared link restores it. */
export function writeQueryParam(name: string, value: string): void {
  try {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(name, value); else url.searchParams.delete(name);
    window.history.replaceState(null, '', url);
  } catch { /* non-browser env */ }
}

export function topicsToCsv(byTopic: Record<string, number>): string {
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return ['topic,events', ...Object.entries(byTopic).map(([t, c]) => `${cell(t)},${c}`)].join('\n');
}
