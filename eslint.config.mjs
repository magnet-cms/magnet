import { config as baseConfig } from '@repo/eslint-config/base'
import { config as reactConfig } from '@repo/eslint-config/react-internal'

/**
 * Root ESLint config — used by lint-staged when ESLint is invoked from the repo root.
 *
 * Per-package eslint.config.mjs files are used by `turbo run lint` (invoked from each
 * package directory) and provide package-type-specific rules. This root config mirrors
 * those overrides using `files` patterns so lint-staged works correctly.
 */
export default [
  { ignores: ['apps/docs/.source/**'] },
  ...baseConfig,

  // Load React + react-hooks plugins for React packages (needed to resolve eslint-disable comments)
  ...reactConfig
    .filter((c) => c.plugins)
    .map((c) => ({
      ...c,
      files: [
        'packages/client/**/*.{ts,tsx}',
        'packages/plugins/**/*.{ts,tsx}',
        'apps/docs/**/*.{ts,tsx}',
      ],
    })),

  // Node.js globals for scripts, sdk bin, and root config files
  {
    files: ['scripts/**/*.{js,ts}', 'packages/client/sdk/**/*.{js,ts}', '*.{js,cjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
  },

  // Package-specific rule overrides (mirrors per-package eslint.config.mjs)
  {
    files: ['packages/adapters/db-drizzle/**/*.ts', 'packages/adapters/db-mongoose/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },
  {
    files: [
      'packages/adapters/db-drizzle/**/*.ts',
      'packages/adapters/auth-clerk/**/*.ts',
      'packages/core/**/*.ts',
      'packages/plugins/playground/**/*.{ts,tsx}',
      'packages/plugins/polar/**/*.{ts,tsx}',
      'packages/plugins/sentry/**/*.{ts,tsx}',
      'packages/plugins/stripe/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['packages/common/**/*.ts', 'packages/core/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },
  {
    files: [
      'packages/client/admin/**/*.{ts,tsx}',
      'packages/plugins/playground/**/*.{ts,tsx}',
      'apps/e2e/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: [
      'packages/client/admin/**/*.{ts,tsx}',
      'packages/client/ui/**/*.{ts,tsx}',
      'packages/plugins/playground/**/*.{ts,tsx}',
      'packages/plugins/polar/**/*.{ts,tsx}',
      'packages/plugins/sentry/**/*.{ts,tsx}',
      'packages/plugins/stripe/**/*.{ts,tsx}',
      'apps/docs/**/*.{ts,tsx}',
    ],
    rules: {
      'react/prop-types': 'off',
    },
  },
  {
    files: ['packages/client/admin/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    files: [
      'packages/core/**/*.ts',
      'packages/client/admin/**/*.{ts,tsx}',
      'packages/client/ui/**/*.{ts,tsx}',
      'packages/cli/**/*.ts',
      'packages/create-magnet/**/*.ts',
      'apps/e2e/**/*.ts',
    ],
    rules: {
      'turbo/no-undeclared-env-vars': 'off',
    },
  },
  {
    files: ['packages/cli/**/*.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
]
