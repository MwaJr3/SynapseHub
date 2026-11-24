export function statusTone(status: string): string {
  switch (status) {
    case 'mastered': return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    case 'developing': return 'bg-amber-950 text-amber-300 border border-amber-800';
    default: return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}

export function confidenceTone(confidence: string): string {
  switch (confidence) {
    case 'high': return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    case 'moderate': return 'bg-sky-950 text-sky-300 border border-sky-800';
    default: return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}

export const MODEL_NOTE =
  'Mastery is a transparent weighted-evidence estimate (not machine learning). Uncertainty is shown when evidence is limited.';

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Learner-owned copy of the pre/post evidence table. */
export function prePostToCsv(rows: { skill_id: number; pre: number | null; post: number | null; delta: number | null; meets_threshold_now: boolean }[]): string {
  return ['skill_id,pre,post,change,meets_threshold',
    ...rows.map((r) => [r.skill_id, r.pre, r.post, r.delta, r.meets_threshold_now ? 'yes' : 'not yet'].map(csvCell).join(','))].join('\n');
}
