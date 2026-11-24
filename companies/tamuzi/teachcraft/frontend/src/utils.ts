export function workflowTone(status: string): string {
  switch (status) {
    case 'published': return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    case 'review': return 'bg-amber-950 text-amber-300 border border-amber-800';
    case 'draft': return 'bg-sky-950 text-sky-300 border border-sky-800';
    default: return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}

export const EXPORT_NOTE =
  'Static HTML export preserves text and layout; interactive question behaviour does not survive export.';

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Prompts and choices only; correct answers are never sent to the client. */
export function questionsToCsv(rows: { kind: string; prompt: string; choices: string[] }[]): string {
  return ['kind,prompt,choices', ...rows.map((q) => [q.kind, q.prompt, q.choices.join(' | ')].map(csvCell).join(','))].join('\n');
}
