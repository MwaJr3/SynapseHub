export function stateTone(state: string): string {
  switch (state) {
    case 'completed': return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    case 'in_progress': return 'bg-sky-950 text-sky-300 border border-sky-800';
    case 'needs_review': return 'bg-amber-950 text-amber-300 border border-amber-800';
    default: return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}

export function stateLabel(state: string): string {
  return { not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed', needs_review: 'Needs Review' }[state] ?? state;
}

export function syncTone(status: string): string {
  switch (status) {
    case 'applied': case 'resolved': return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    case 'conflict': return 'bg-amber-950 text-amber-300 border border-amber-800';
    default: return 'bg-rose-950 text-rose-300 border border-rose-800';
  }
}

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

export function notesToText(lesson: string, notes: { body: string }[]): string {
  return [`Notes: ${lesson}`, '', ...notes.map((n) => `- ${n.body}`)].join('\n');
}
