import baseConfig from '@repo/tsup/config'
import { defineConfig } from 'tsup'

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node18',
  shims: true,
  external: ['mysql2', 'mysql2/promise', 'better-sqlite3', 'pg', '@neondatabase/serverless'],
  banner: {
    js: '#!/usr/bin/env node',
  },
})
