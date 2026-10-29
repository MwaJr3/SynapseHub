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

export function shortHash(hash: string): string {
  return hash ? `${hash.slice(0, 12)}…` : '—';
}

export function kindTone(kind: string): string {
  switch (kind) {
    case 'changed':
      return 'bg-rose-950 text-rose-300 border border-rose-800';
    case 'missing':
      return 'bg-amber-950 text-amber-300 border border-amber-800';
    case 'new':
      return 'bg-sky-950 text-sky-300 border border-sky-800';
    case 'matched':
      return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
    default:
      return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}
