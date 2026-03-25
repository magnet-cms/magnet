// @ts-check
import { nextJsConfig } from '@repo/eslint-config/next-js'

export default [
  ...nextJsConfig,
  {
    ignores: ['eslint.config.mjs', '.next/**', 'out/**', '.source/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'react/prop-types': 'off',
    },
  },
]
