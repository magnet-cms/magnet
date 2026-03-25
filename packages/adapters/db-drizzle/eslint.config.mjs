// @ts-check
import { config as baseConfig } from '@repo/eslint-config/base'

export default [
  ...baseConfig,
  {
    rules: {
      // require() is used for optional database drivers (mysql2, better-sqlite3)
      '@typescript-eslint/no-require-imports': 'off',
      // Drizzle schema builder patterns use any for generic column types
      '@typescript-eslint/no-explicit-any': 'off',
      // Function type used for Drizzle schema constructors
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },
  {
    ignores: ['eslint.config.mjs', 'dist/**'],
  },
]
