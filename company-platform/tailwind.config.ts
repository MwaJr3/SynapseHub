import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#141824',
          muted: '#4b5568',
          subtle: '#7a8496',
        },
        surface: {
          DEFAULT: '#ffffff',
          sunken: '#f5f7fb',
        },
        line: {
          DEFAULT: '#e3e8f0',
          strong: '#c7d0dd',
        },
        // Velaqori Systems: precise, cool technical accent.
        vela: {
          50: '#eef4ff',
          100: '#dbe6ff',
          500: '#3b6fd4',
          600: '#2f5ab0',
          700: '#27488c',
          900: '#16264a',
        },
        // Tamuzi Learning: warmer, welcoming accent.
        tamuzi: {
          50: '#fff6ed',
          100: '#ffe8d1',
          500: '#e07b28',
          600: '#c26213',
          700: '#9c4d0e',
          900: '#4d2607',
        },
        signal: {
          ok: '#0f766e',
          warn: '#b45309',
          bad: '#b91c1c',
          info: '#1d4ed8',
        },
      },
      maxWidth: {
        prose: '68ch',
      },
    },
  },
  plugins: [],
};

export default config;
