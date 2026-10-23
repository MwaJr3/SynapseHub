/** Theme switcher: Light / Dark / System, persisted, SSR-safe. */
'use client';

import { useEffect, useState } from 'react';

type ThemeChoice = 'light' | 'dark' | 'system';

function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = choice === 'dark' || (choice === 'system' && prefersDark);
  root.classList.toggle('dark', dark);
  root.dataset.themeChoice = choice;
}

export function ThemeSwitcher() {
  const [choice, setChoice] = useState<ThemeChoice>('system');

  useEffect(() => {
    const stored = window.localStorage.getItem('theme-choice');
    const initial: ThemeChoice =
      stored === 'light' || stored === 'dark' || stored === 'system'
        ? stored
        : 'system';
    setChoice(initial);
    applyTheme(initial);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (window.localStorage.getItem('theme-choice') !== 'light' && window.localStorage.getItem('theme-choice') !== 'dark') {
        applyTheme('system');
      }
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const choose = (next: ThemeChoice) => {
    setChoice(next);
    window.localStorage.setItem('theme-choice', next);
    applyTheme(next);
  };

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex items-center gap-1 rounded-md border border-line p-1"
    >
      {(['light', 'dark', 'system'] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => choose(option)}
          aria-pressed={choice === option}
          className={`rounded px-2 py-1 text-xs capitalize ${
            choice === option ? 'accent-bg text-white' : 'text-muted'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
