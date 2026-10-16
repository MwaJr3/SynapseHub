/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design tokens are RGB channel triplets defined in src/styles/index.css
        // so that Tailwind opacity modifiers keep working (e.g. bg-accent/10).
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          raised: 'rgb(var(--surface-2) / <alpha-value>)',
        },
        panel: {
          DEFAULT: 'rgb(var(--panel) / <alpha-value>)',
          strong: 'rgb(var(--panel-2) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          strong: 'rgb(var(--border-strong) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--text) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
          subtle: 'rgb(var(--text-subtle) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
          ink: 'rgb(var(--accent-ink) / <alpha-value>)',
        },
        signal: 'rgb(var(--accent-2) / <alpha-value>)',
        caution: 'rgb(var(--caution) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          '"Inter Variable"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono Variable"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
      },
      borderRadius: {
        card: '14px',
        pill: '999px',
      },
      boxShadow: {
        raised:
          '0 1px 2px rgb(15 22 36 / 0.04), 0 8px 24px -12px rgb(15 22 36 / 0.18)',
        lift: '0 2px 4px rgb(15 22 36 / 0.05), 0 18px 40px -18px rgb(15 22 36 / 0.28)',
      },
      maxWidth: {
        prose: '68ch',
        shell: '1200px',
      },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      keyframes: {
        'fade-rise': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'sync-pulse': {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 520ms cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'sync-pulse': 'sync-pulse 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
