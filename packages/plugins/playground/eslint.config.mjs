// @ts-check
import { config } from '@repo/eslint-config/react-internal'

export default [
  ...config,
  {
    ignores: ['eslint.config.mjs', 'dist/**'],
  },
  {
    rules: {
      // Playground schema builder uses dynamic any types for field configs
      '@typescript-eslint/no-explicit-any': 'off',
      // require() used for lazy loading optional modules
      '@typescript-eslint/no-require-imports': 'off',
      'react/prop-types': 'off',
    },
  },
]
