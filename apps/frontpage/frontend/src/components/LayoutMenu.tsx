import { LayoutGrid, LayoutList, Newspaper, Rows3 } from 'lucide-react';
import type { Layout } from '../types';
import { Segmented } from './common';

export const LAYOUTS: { value: Layout; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: 'compact', label: 'Compact', hint: 'One line per article', icon: <Rows3 size={16} aria-hidden /> },
  { value: 'comfortable', label: 'List', hint: 'Title and excerpt', icon: <LayoutList size={16} aria-hidden /> },
  { value: 'cards', label: 'Cards', hint: 'Visual grid', icon: <LayoutGrid size={16} aria-hidden /> },
  { value: 'magazine', label: 'Magazine', hint: 'Lead story and grid', icon: <Newspaper size={16} aria-hidden /> },
];

export function LayoutMenu({ value, onChange, categoryName, perCategory, onTogglePerCategory }: {
  value: Layout;
  onChange: (l: Layout) => void;
  categoryName?: string;
  perCategory: boolean;
  onTogglePerCategory: (on: boolean) => void;
}) {
  return (
    <div className="layout-menu">
      <Segmented label="Layout" value={value} onChange={onChange} options={LAYOUTS.map((l) => ({ value: l.value, label: l.label, icon: l.icon }))} />
      {categoryName && (
        <label className="check check-sm">
          <input type="checkbox" checked={perCategory} onChange={(e) => onTogglePerCategory(e.target.checked)} />
          <span>Remember for {categoryName}</span>
        </label>
      )}
    </div>
  );
}
