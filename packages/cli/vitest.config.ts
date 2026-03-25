import { nestConfig } from '@repo/vitest/base'
import { mergeConfig } from 'vitest/config'

export default mergeConfig(nestConfig, {
  test: {
    testTimeout: 15_000,
  },
})
