// @ts-check
import { config as baseConfig } from '@repo/eslint-config/base'

export default [
  ...baseConfig,
  {
    // require() is used for lazy imports to avoid circular dependencies
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    ignores: ['eslint.config.mjs', 'dist/**'],
  },
]
