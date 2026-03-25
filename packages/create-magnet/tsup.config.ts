import baseConfig from '@repo/tsup/config'
import { defineConfig } from 'tsup'

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node18',
  shims: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
})
