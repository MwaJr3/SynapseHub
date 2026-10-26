export function licenseTone(uncertain: boolean): string {
  return uncertain
    ? 'bg-rose-950 text-rose-300 border border-rose-800'
    : 'bg-emerald-950 text-emerald-300 border border-emerald-800';
}

export function reuseLabel(reuse: { can_adapt: boolean; can_redistribute: boolean; can_commercial: boolean }): string {
  const parts = [
    reuse.can_adapt ? 'may adapt' : 'no adaptation',
    reuse.can_redistribute ? 'may redistribute' : 'no redistribution',
    reuse.can_commercial ? 'commercial use OK' : 'non-commercial only',
  ];
  return parts.join(' · ');
}

export const LICENSE_CAUTION =
  'A resource being publicly accessible does not make it openly licensed. Unknown licenses carry no legal certainty.';

export function translationStatusTone(status: string): string {
  switch (status) {
    case 'approved': return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    case 'in_review': return 'bg-amber-950 text-amber-300 border border-amber-800';
    case 'rejected': return 'bg-rose-950 text-rose-300 border border-rose-800';
    default: return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}
