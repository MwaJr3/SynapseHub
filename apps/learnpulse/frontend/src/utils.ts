export function flagTone(status: string): string {
  switch (status) {
    case 'open': return 'bg-amber-950 text-amber-300 border border-amber-800';
    case 'actioned': return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    default: return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}

export const FAIRNESS_NOTE =
  'Flags are supportive review signals with visible rules and evidence — never labels of ability or predictions of failure.';
