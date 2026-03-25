// @ts-check
import { config as baseConfig } from '@repo/eslint-config/base'

export default [
  ...baseConfig,
  {
    ignores: ['eslint.config.mjs', 'dist/**'],
  },
  {
    rules: {
      // NestJS decorators require Function as constructor type (Reflect.metadata pattern)
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },
]
