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
      // Export/Import consistency rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_', 
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }],
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { 
        prefer: 'type-imports',
        fixStyle: 'separate-type-imports'
      }],
      
      // Code quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'prefer-const': 'error',
      'no-var': 'error',
      
      // React rules
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      
      // Import/Export rules (no new plugins needed)
      'no-duplicate-imports': 'error',
      
      // Export/Import conventions
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportNamedDeclaration[declaration.type="FunctionDeclaration"] ~ ExportDefaultDeclaration',
          message: 'Components should use either default OR named exports, not both in same file'
        },
        {
          selector: 'ExportDefaultDeclaration[declaration.type="ArrowFunctionExpression"]',
          message: 'Use function declarations for default exports, not arrow functions'
        }
      ]
    },
    settings: { react: { version: 'detect' } },
  },

  // Test files - relax any rules
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn'
    },
  },

  // Service Worker - special rules
  {
    files: ['**/sw.ts', '**/sw.js', 'public/sw.js'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn'
    },
  },

  // Fetch guard - allow console for debugging
  {
    files: ['**/fetchGuard.ts'],
    rules: {
      'no-console': 'off'
    },
  },
];