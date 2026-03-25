// @ts-check
import { config as baseConfig } from '@repo/eslint-config/base'

export default [
  ...baseConfig,
  {
    // create-magnet is a standalone CLI — disable Turbo env var checks
    rules: {
      'turbo/no-undeclared-env-vars': 'off',
    },
  },
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'bin/**'],
  },
]
