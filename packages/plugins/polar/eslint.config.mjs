// @ts-check
import { config } from '@repo/eslint-config/react-internal'

export default [
  ...config,
  {
    ignores: ['eslint.config.mjs', 'dist/**'],
  },
  {
    // require() is used for lazy module loading (optional peer dep pattern)
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'react/prop-types': 'off',
    },
  },
]
