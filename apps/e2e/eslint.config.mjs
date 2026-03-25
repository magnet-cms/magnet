// @ts-check
import { config as baseConfig } from '@repo/eslint-config/base'

export default [
  ...baseConfig,
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'playwright-report/**', 'test-results/**'],
  },
  {
    rules: {
      // E2E tests use runtime env vars not declared in turbo.json
      'turbo/no-undeclared-env-vars': 'off',
      // E2E tests use any for dynamic test data
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]
