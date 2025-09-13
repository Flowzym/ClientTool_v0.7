import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    
    rules: {
      // Relax strictness to focus on functional issues first
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
        caughtErrors: 'none'
      }],
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'no-unused-expressions': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-case-declarations': 'warn',
      'no-useless-escape': 'warn',
      'prefer-const': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'no-constant-binary-expression': 'warn',
    },

    overrides: [
      {
        files: ['**/*.test.ts', '**/*.test.tsx'],
        rules: {
          '@typescript-eslint/no-explicit-any': 'off',
          '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
        }
      },
      {
        files: ['src/sw.ts', 'src/sw/**/*.ts'],
        rules: {
          '@typescript-eslint/ban-ts-comment': 'off',
          '@typescript-eslint/no-unused-expressions': 'off'
        }
      },
      {
        files: ['src/utils/fetchGuard.ts'],
        rules: {
          '@typescript-eslint/no-this-alias': 'off'
        }
      }
    ]
  }
);
