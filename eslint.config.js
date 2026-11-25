import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    // workniche/, contextvault/ and vocal-separator/ are self-contained apps with their own
    // tooling. sites/portfolio and coursework/ are the same: each has its own
    // config or none, and neither is part of the root site this config exists for.
    // companies/ is *not* ignored — its frontends were linted as `apps/` before
    // the 2026-10-29 move and are linted as `companies/` after it.
    ignores: [
      'dist',
      '**/dist/**',
      'node_modules',
      'coverage',
      'tools/northstar/vendor',
      'public',
      'workniche',
      'contextvault',
      'vocal-separator',
      'sites',
      'coursework',
      '**/.next/**',
      '**/.venv/**',
      'company-platform/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: [
      'scripts/**/*.mjs',
      'scripts/**/*.ts',
      '*.config.js',
      'native/mobile/**/*.cjs',
      'tools/synapsehub-smoke/*.mjs',
    ],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      // CLI scripts report scan progress and results as part of their interface.
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
    },
  },
  {
    // The scanner is a CLI: stdout is where a CLI reports. Its tests assert on the
    // report it writes, not on the console.
    files: ['tools/northstar/engine/scan.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // The UX engine is a Node CLI and a plugin: its modules run in Node (process,
    // fs, timers) and print to stdout, which is how the CLI reports anything.
    files: ['tools/northstar/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
    },
  },
  {
    files: ['company-platform/scripts/**/*.{ts,mjs}'],
    rules: {
      // CLI scripts report migration/seed progress as part of their interface.
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
    },
  },
);
