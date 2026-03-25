import { config as baseConfig } from '@repo/eslint-config/base'

/**
 * Root ESLint config — used by lint-staged when ESLint is invoked from the repo root.
 *
 * Per-package eslint.config.mjs files are used by `turbo run lint` (invoked from each
 * package directory) and provide package-type-specific rules (React, Next.js, etc.).
 */
export default [...baseConfig]
