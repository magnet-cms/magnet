// @ts-check
import { config as baseConfig } from '@repo/eslint-config/base'

export default [
  ...baseConfig,
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'bin/**'],
  },
  {
    rules: {
      // CLI uses runtime env vars (DATABASE_URL) not declared in turbo.json
      'turbo/no-undeclared-env-vars': 'off',
      // CLI uses {} type for generic Drizzle adapter compatibility
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
]
