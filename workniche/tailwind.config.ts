import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
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
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
        },
        signal: {
          ok: '#0f766e',
          warn: '#b45309',
          bad: '#b91c1c',
          info: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
};

export default config;
