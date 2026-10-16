import { useId } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import { themeOptions } from '@/lib/theme';
import { cn } from '@/lib/cn';

interface ThemeSwitcherProps {
  className?: string;
  /** Compact variant used inside the sticky header on small screens. */
  compact?: boolean;
}

export function ThemeSwitcher({
  className,
  compact = false,
}: ThemeSwitcherProps) {
  const { preference, resolved, setPreference } = useTheme();
  const labelId = useId();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span id={labelId} className="sr-only">
        Colour theme
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex items-center gap-1 rounded-pill border border-line bg-panel p-1"
      >
        {themeOptions.map((option) => {
          const active = preference === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              title={option.hint}
              onClick={() => setPreference(option.id)}
              className={cn(
                'rounded-pill px-2.5 py-1 font-mono text-2xs uppercase tracking-[0.1em] transition-colors duration-200',
                active
                  ? 'bg-accent text-accent-ink'
                  : 'text-ink-muted hover:bg-panel-strong hover:text-ink',
              )}
            >
              {compact ? option.label.slice(0, 1) : option.label}
              {compact && <span className="sr-only">{option.label}</span>}
            </button>
          );
        })}
      </div>
      <span className="mono-meta hidden lg:inline" aria-live="polite">
        {resolved === 'dark' ? 'Dark' : 'Light'} rendering
      </span>
    </div>
  );
}
