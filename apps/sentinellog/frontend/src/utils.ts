export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

export function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

export function severityTone(severity: string): string {
  switch (severity) {
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

export function eventTypeTone(eventType: string): string {
  switch (eventType) {
    case 'auth_failure':
      return 'bg-rose-950 text-rose-300 border border-rose-800';
    case 'auth_success':
      return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    case 'error':
      return 'bg-amber-950 text-amber-300 border border-amber-800';
    default:
      return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}
