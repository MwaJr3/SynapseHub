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

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Build a CSV of a transcript so people can keep their own record. */
export function transcriptToCsv(lines: { course_code: string; title: string; term: string; credit_hours: number; average: number | null; letter: string | null; grade_points: number | null }[]): string {
  const rows = [['Course', 'Title', 'Term', 'Credits', 'Average', 'Letter', 'Grade points']];
  for (const l of lines) rows.push([l.course_code, l.title, l.term, l.credit_hours, l.average, l.letter, l.grade_points] as never);
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}
