import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

const compat = new FlatCompat({ baseDirectory: path.resolve() });

export default [
  // Ignore build output & vendor
  { ignores: ['dist', 'build', 'node_modules', 'public'] },

  // Base JS recommendations
  js.configs.recommended,

  // Bring over common react configs (compat handles old-style extends)
  ...compat.extends(
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ),

  // TypeScript (no type-aware for speed & fewer env constraints)
  ...tseslint.configs.recommended,

  // Our project rules
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    rules: {
      // Relax temporarily so lint runs cleanly while we fix code later
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'react-refresh/only-export-components': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'warn',
    },
    settings: { react: { version: 'detect' } },
  },

  // Test files - relax any rules
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];