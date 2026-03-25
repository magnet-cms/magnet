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
      // NEXT_PUBLIC_ env vars are set by Next.js consumers of this library
      'turbo/no-undeclared-env-vars': 'off',
    },
  },
]
