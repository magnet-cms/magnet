// @ts-check
import { config as baseConfig } from '@repo/eslint-config/base'

export default [
  ...baseConfig,
  {
    rules: {
      // require() is used for lazy loading optional modules and avoiding circular deps
      '@typescript-eslint/no-require-imports': 'off',
      // Function type is idiomatic for NestJS/TypeScript reflection API (Reflect.getMetadata)
      '@typescript-eslint/no-unsafe-function-type': 'off',
      // Core uses many runtime env vars (NODE_ENV, JWT_SECRET, etc.) not in turbo.json
      'turbo/no-undeclared-env-vars': 'off',
    },
  },
  {
    ignores: ['eslint.config.mjs', 'dist/**'],
  },
]
