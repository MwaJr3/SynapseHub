import { useId } from 'react';
import { X } from 'lucide-react';
import type { Library } from '../types';

export interface SearchParamsState {
  feed: string;
  cat: string;
  from: string;
  to: string;
  sort: string;
  unread: boolean;
}

export function SearchFilters({ library, value, onChange, showSort = true }: {
  library: Library | null;
  value: SearchParamsState;
  onChange: (patch: Partial<SearchParamsState>) => void;
  showSort?: boolean;
}) {
  const id = useId();
  const active = value.feed || value.cat || value.from || value.to || value.unread;
  return (
    <div className="filters" role="group" aria-label="Filter results">
      <div className="filter">
        <label htmlFor={`${id}-feed`}>Feed</label>
        <select id={`${id}-feed`} className="select select-sm" value={value.feed} onChange={(e) => onChange({ feed: e.target.value })}>
          <option value="">All feeds</option>
          {library?.feeds.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
        </select>
      </div>
      <div className="filter">
        <label htmlFor={`${id}-cat`}>Category</label>
        <select id={`${id}-cat`} className="select select-sm" value={value.cat} onChange={(e) => onChange({ cat: e.target.value })}>
          <option value="">All categories</option>
          {library?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="filter">
        <label htmlFor={`${id}-from`}>From</label>
        <input id={`${id}-from`} type="date" className="input input-sm" value={value.from} max={value.to || undefined} onChange={(e) => onChange({ from: e.target.value })} />
      </div>
      <div className="filter">
        <label htmlFor={`${id}-to`}>To</label>
        <input id={`${id}-to`} type="date" className="input input-sm" value={value.to} min={value.from || undefined} onChange={(e) => onChange({ to: e.target.value })} />
      </div>
      {showSort && (
        <div className="filter">
          <label htmlFor={`${id}-sort`}>Sort</label>
          <select id={`${id}-sort`} className="select select-sm" value={value.sort} onChange={(e) => onChange({ sort: e.target.value })}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      )}
      <label className="check check-sm filter-check"><input type="checkbox" checked={value.unread} onChange={(e) => onChange({ unread: e.target.checked })} /><span>Unread only</span></label>
      {active && <button className="btn btn-ghost btn-sm" onClick={() => onChange({ feed: '', cat: '', from: '', to: '', unread: false })}><X size={14} aria-hidden /> Clear filters</button>}
    </div>
  );
}
