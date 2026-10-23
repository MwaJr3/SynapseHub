export function severityTone(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-rose-950 text-rose-200 border border-rose-700';
    case 'high':
      return 'bg-rose-950 text-rose-300 border border-rose-800';
    case 'medium':
      return 'bg-amber-950 text-amber-300 border border-amber-800';
    case 'low':
      return 'bg-sky-950 text-sky-300 border border-sky-800';
    default:
      return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}

export function statusTone(status: string): string {
  switch (status) {
    case 'new':
      return 'bg-rose-950 text-rose-300 border border-rose-800';
    case 'triaged':
      return 'bg-amber-950 text-amber-300 border border-amber-800';
    case 'contained':
      return 'bg-sky-950 text-sky-300 border border-sky-800';
    case 'resolved':
      return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    case 'closed':
      return 'bg-slate-800 text-slate-300 border border-slate-700';
    default:
      return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}

export const HONESTY_NOTICE =
  'A suspicious pattern is not proof of an attack — statuses and alerts reflect triage judgement, not certainty.';
