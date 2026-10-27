import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    // workniche/ and vocal-separator/ are self-contained apps with their own
    // tooling. projects/ holds consolidated copies of other repositories'
    // projects, each self-contained with its own tooling (see
    // projects/README.md).
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'public',
      'workniche',
      'vocal-separator',
      'projects',
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
    files: ['scripts/**/*.mjs', 'scripts/**/*.ts', '*.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      // CLI scripts report scan progress and results as part of their interface.
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
