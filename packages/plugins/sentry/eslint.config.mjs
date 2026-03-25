// @ts-check
import { config } from '@repo/eslint-config/react-internal'

export default [
  ...config,
  {
    // require() is used for lazy loading @sentry/nestjs (optional peer dep)
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'react/prop-types': 'off',
    },
  },
  {
    ignores: ['eslint.config.mjs', 'dist/**'],
  },
]
