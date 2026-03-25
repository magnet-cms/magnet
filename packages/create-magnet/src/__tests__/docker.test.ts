import { describe, expect, it } from 'vitest'

import { generateDockerCompose, generateSupabaseConfig } from '../generators/docker.js'
import type { ProjectConfig } from '../types.js'

function makeConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    projectName: 'test-app',
    projectPath: '/tmp/test-app',
    database: 'mongoose',
    plugins: [],
    storage: 'none',
    vault: 'db',
    includeExample: false,
    packageManager: 'npm',
    ...overrides,
  }
}

describe('generateDockerCompose — Mongoose', () => {
  const config = makeConfig({ database: 'mongoose' })
  const output = generateDockerCompose(config)

  it('includes auth credentials magnet/magnet', () => {
    expect(output).toContain('MONGO_INITDB_ROOT_USERNAME: magnet')
    expect(output).toContain('MONGO_INITDB_ROOT_PASSWORD: magnet')
  })

  it('includes Mongo Express admin UI on port 8081', () => {
    expect(output).toContain('mongo-express')
    expect(output).toContain('8081')
  })

  it('has configurable port via env var', () => {
    expect(output).toContain('${MONGO_PORT:-27017}:27017')
  })

  it('includes healthcheck for mongodb', () => {
    expect(output).toContain('healthcheck')
    expect(output).toContain('mongosh')
  })

  it('uses sanitized container name', () => {
    expect(output).toContain('test-app-mongodb')
  })
})

describe('generateDockerCompose — Postgres (drizzle-neon)', () => {
  const config = makeConfig({ database: 'drizzle-neon' })
  const output = generateDockerCompose(config)

  it('uses magnet/magnet credentials instead of postgres/postgres', () => {
    expect(output).toContain('POSTGRES_USER: magnet')
    expect(output).toContain('POSTGRES_PASSWORD: magnet')
    expect(output).not.toContain('POSTGRES_USER: postgres')
  })

  it('includes pgAdmin on port 5050', () => {
    expect(output).toContain('pgadmin')
    expect(output).toContain('5050')
  })

  it('has configurable port via env var', () => {
    expect(output).toContain('${POSTGRES_PORT:-5432}:5432')
  })

  it('includes healthcheck for postgres', () => {
    expect(output).toContain('healthcheck')
    expect(output).toContain('pg_isready')
  })

  it('uses sanitized container name', () => {
    expect(output).toContain('test-app-postgres')
  })
})

describe('generateDockerCompose — Postgres (drizzle-supabase, postgres mode)', () => {
  const config = makeConfig({
    database: 'drizzle-supabase',
    supabaseLocalMode: 'postgres',
  })
  const output = generateDockerCompose(config)

  it('generates postgres compose for supabase adapter in postgres mode', () => {
    expect(output).toContain('POSTGRES_USER: magnet')
    expect(output).toContain('pgadmin')
  })
})

describe('generateDockerCompose — Supabase CLI mode', () => {
  const config = makeConfig({
    database: 'drizzle-supabase',
    supabaseLocalMode: 'cli',
  })
  const output = generateDockerCompose(config)

  it('returns empty string when supabase CLI mode is selected', () => {
    expect(output).toBe('')
  })
})

describe('generateSupabaseConfig', () => {
  const output = generateSupabaseConfig('my-project')

  it('includes project name', () => {
    expect(output).toContain('id = "my-project"')
  })

  it('includes API config', () => {
    expect(output).toContain('[api]')
    expect(output).toContain('port = 54321')
  })

  it('includes DB config', () => {
    expect(output).toContain('[db]')
  })

  it('includes auth config', () => {
    expect(output).toContain('[auth]')
  })
})
