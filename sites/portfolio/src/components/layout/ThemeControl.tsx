import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useTheme } from '@/hooks/useTheme';
import { themeModes, type ThemeMode } from '@/lib/theme';
import { Icon, type IconName } from '@/components/ui/Icon';

const modeIcon: Record<ThemeMode, IconName> = {
  light: 'sun',
  dark: 'moon',
  system: 'monitor',
  hybrid: 'blend',
};

/**
 * Theme control: an icon button that opens a menu of the four modes.
 * Keyboard operable (Enter/Space to open, arrows to move, Escape to close),
 * with the current state announced rather than conveyed by colour alone.
 */
export function ThemeControl({ className }: { className?: string }) {
  const { mode, resolved, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const labelId = useId();
  const current = themeModes.find((m) => m.id === mode) ?? themeModes[3];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const index = themeModes.findIndex((m) => m.id === mode);
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const next = (index + delta + themeModes.length) % themeModes.length;
        setMode(themeModes[next].id);
        itemRefs.current[next]?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, mode, setMode]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-labelledby={`${labelId}-current`}
        className={cn(
          'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-line bg-surface px-2 sm:px-2.5',
          'text-fg-muted transition-colors hover:border-line-strong hover:text-fg',
        )}
      >
        <Icon name={modeIcon[mode]} size={16} aria-hidden />
        {/* Kept in the accessibility tree at every width: the trigger's
            aria-labelledby points at it, so it is visually hidden (not removed)
            when there is no room for the word. */}
        <span id={`${labelId}-current`} className="sr-only text-xs font-medium sm:not-sr-only">
          {current.label}
        </span>
        <Icon name="chevron-down" size={13} aria-hidden className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Colour theme"
          className={cn(
            'absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-xl border border-line bg-surface-raised p-1.5',
            'shadow-[var(--shadow-lift)] animate-fade-in',
          )}
        >
          <p className="px-2.5 pb-1.5 pt-2 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-fg-subtle">
            Theme · currently rendering {resolved}
          </p>
          {themeModes.map((option, index) => {
            const selected = option.id === mode;
            return (
              <button
                key={option.id}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setMode(option.id);
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                  selected ? 'bg-accent-soft text-fg' : 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
                )}
              >
                <Icon name={modeIcon[option.id]} size={16} className="mt-0.5 shrink-0" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-fg">{option.label}</span>
                  <span className="block text-xs leading-snug text-fg-subtle">{option.description}</span>
                </span>
                {selected ? <Icon name="check" size={14} className="ml-auto mt-1 shrink-0 text-accent" aria-hidden /> : null}
              </button>
            );
          })}
          <p className="border-t border-line px-2.5 pb-1.5 pt-2 text-[0.7rem] leading-snug text-fg-subtle">
            Your choice is saved in this browser. Hybrid mixes light editorial sections with dark technical
            panels; Light and Dark apply one scheme everywhere.
          </p>
        </div>
      ) : null}
    </div>
  );
}
