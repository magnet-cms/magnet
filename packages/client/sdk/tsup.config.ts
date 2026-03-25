import baseConfig from '@repo/tsup/config'
import { defineConfig } from 'tsup'

export default defineConfig([
  {
    ...baseConfig,
    entry: ['src/index.ts'],
  },
  {
    ...baseConfig,
    entry: ['src/cli.ts'],
    dts: false,
  },
])
