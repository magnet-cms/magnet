// @ts-check
import { config as baseConfig } from '@repo/eslint-config/base'

export default [
  ...baseConfig,
  {
    rules: {
      // Mongoose schema/plugin APIs are inherently dynamic — any is unavoidable
      '@typescript-eslint/no-explicit-any': 'off',
      // Function type used for Mongoose schema constructors via Reflect.getMetadata
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },
  {
    ignores: ['eslint.config.mjs', 'dist/**'],
  },
]
