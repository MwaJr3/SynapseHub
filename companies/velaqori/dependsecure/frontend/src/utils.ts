export function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

export function remediationTone(status: string): string {
  switch (status) {
    case 'Open':
      return 'bg-rose-950 text-rose-300 border border-rose-800';
    case 'Under Review':
      return 'bg-amber-950 text-amber-300 border border-amber-800';
    case 'Resolved':
      return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    case 'Accepted Risk':
      return 'bg-sky-950 text-sky-300 border border-sky-800';
    default:
      return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}

export function scanStatusTone(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    case 'no-findings':
      return 'bg-sky-950 text-sky-300 border border-sky-800';
    case 'failed':
      return 'bg-rose-950 text-rose-300 border border-rose-800';
    default:
      return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}
