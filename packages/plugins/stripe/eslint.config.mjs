// @ts-check
import { config } from '@repo/eslint-config/react-internal'

export default [
  ...config,
  {
    ignores: ['eslint.config.mjs', 'dist/**'],
  },
  {
    rules: {
      // require() is used for lazy module loading (optional peer dep pattern)
      '@typescript-eslint/no-require-imports': 'off',
      'react/prop-types': 'off',
    },
  },
]
