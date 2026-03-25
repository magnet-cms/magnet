// @ts-check
import { config } from '@repo/eslint-config/react-internal'

export default [
  ...config,
  {
    ignores: ['eslint.config.mjs', 'dist/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'react/prop-types': 'off',
      // react-intl's `intl` object is stable by design — missing from exhaustive-deps is a false positive
      'react-hooks/exhaustive-deps': 'off',
      // Form validation utilities and Vite env typings legitimately use any
      '@typescript-eslint/no-explicit-any': 'off',
      // BASE_URL is a Vite built-in (from vite.config base option), not a turbo env var
      'turbo/no-undeclared-env-vars': 'off',
    },
  },
]
