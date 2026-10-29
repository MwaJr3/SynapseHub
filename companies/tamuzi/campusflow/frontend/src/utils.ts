export function letterTone(letter: string | null): string {
  switch (letter) {
    case 'A':
      return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    case 'B':
      return 'bg-sky-950 text-sky-300 border border-sky-800';
    case 'C':
      return 'bg-amber-950 text-amber-300 border border-amber-800';
    case 'D':
      return 'bg-orange-950 text-orange-300 border border-orange-800';
    case 'F':
      return 'bg-rose-950 text-rose-300 border border-rose-800';
    default:
      return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}

export function attendanceTone(status: string): string {
  switch (status) {
    case 'present':
      return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    case 'late':
      return 'bg-amber-950 text-amber-300 border border-amber-800';
    case 'absent':
      return 'bg-rose-950 text-rose-300 border border-rose-800';
    case 'excused':
      return 'bg-sky-950 text-sky-300 border border-sky-800';
    default:
      return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString();
}
