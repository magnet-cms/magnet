import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { nestConfig } from '@repo/vitest/base'
import { mergeConfig } from 'vitest/config'

const coreRoot = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(coreRoot, 'src')

// tsconfig excludes *.test.ts, so vite-tsconfig-paths does not apply ~/* in tests.
export default mergeConfig(nestConfig, {
  test: {
    // Crypto / FS-heavy tests can exceed 5s when many packages run tests in parallel via Turbo.
    testTimeout: 15_000,
  },
  resolve: {
    alias: {
      '~': srcDir,
    },
  },
})
