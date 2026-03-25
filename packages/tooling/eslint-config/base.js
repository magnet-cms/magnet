import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import onlyWarn from 'eslint-plugin-only-warn'
import prettierPlugin from 'eslint-plugin-prettier'
import turboPlugin from 'eslint-plugin-turbo'
import tseslint from 'typescript-eslint'

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      'turbo/no-undeclared-env-vars': 'warn',
    },
  },
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Reads from .prettierrc.json — single source of truth
      'prettier/prettier': 'error',
    },
  },
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      // Disabled — workspace packages and TypeScript paths are verified by TypeScript
      'import/no-unresolved': 'off',
      'import/no-duplicates': 'error',
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-unused-vars': 'off',
      'import/no-unused-modules': 'error',
    },
  },
  {
    // onlyWarn converts all errors to warnings. Combined with --max-warnings 0 in
    // the lint script, violations still fail the build — but as warnings, not errors.
    // This includes prettier/prettier: formatting violations are warnings here but
    // enforced by --max-warnings 0. Do NOT remove --max-warnings 0 from lint scripts.
    plugins: {
      onlyWarn,
    },
  },
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/.vercel/**',
      '**/build/**',
      '**/.cache/**',
    ],
  },
]
