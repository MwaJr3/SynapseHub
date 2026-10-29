export function classificationTone(classification: string | null): string {
  switch (classification) {
    case 'blunder':
      return 'bg-rose-950 text-rose-300 border border-rose-800';
    case 'mistake':
      return 'bg-amber-950 text-amber-300 border border-amber-800';
    case 'inaccuracy':
      return 'bg-sky-950 text-sky-300 border border-sky-800';
    default:
      return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}

export function formatEval(cp: number | null): string {
  if (cp === null) return '—';
  return (cp / 100).toFixed(2);
}

export function materialLabel(balance: number): string {
  if (balance === 0) return 'level';
  return balance > 0 ? `White +${balance}` : `Black +${-balance}`;
}
