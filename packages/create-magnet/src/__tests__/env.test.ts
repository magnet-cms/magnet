import { describe, expect, it } from 'bun:test'
import { generateDotEnv } from '../generators/config-files.js'
import type { ProjectConfig } from '../types.js'

function makeConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
	return {
		projectName: 'test-app',
		projectPath: '/tmp/test-app',
		database: 'drizzle-neon',
		plugins: [],
		storage: 'none',
		vault: 'db',
		includeExample: false,
		packageManager: 'npm',
		...overrides,
	}
}

describe('generateDotEnv — common fields', () => {
	const config = makeConfig()
	const output = generateDotEnv(config)

	it('includes NODE_ENV=development', () => {
		expect(output).toContain('NODE_ENV=development')
	})

	it('includes PORT=3000', () => {
		expect(output).toContain('PORT=3000')
	})

	it('includes JWT_SECRET', () => {
		expect(output).toContain(
			'JWT_SECRET=magnet-local-dev-secret-change-in-production',
		)
	})

	it('includes comment about local Docker dev', () => {
		expect(output).toContain('local')
	})
})

describe('generateDotEnv — Mongoose', () => {
	const config = makeConfig({ database: 'mongoose', projectName: 'my-app' })
	const output = generateDotEnv(config)

	it('has MongoDB URI with magnet credentials', () => {
		expect(output).toContain(
			'MONGODB_URI=mongodb://magnet:magnet@localhost:27017/my-app',
		)
	})

	it('does NOT include DATABASE_URL', () => {
		expect(output).not.toContain('DATABASE_URL')
	})
})

describe('generateDotEnv — Drizzle Neon', () => {
	const config = makeConfig({
		database: 'drizzle-neon',
		projectName: 'my-app',
	})
	const output = generateDotEnv(config)

	it('has PostgreSQL connection string with magnet credentials', () => {
		expect(output).toContain(
			'DATABASE_URL=postgresql://magnet:magnet@localhost:5432/my-app',
		)
	})

	it('does NOT include SUPABASE env vars', () => {
		expect(output).not.toContain('SUPABASE_URL')
	})
})

describe('generateDotEnv — Drizzle Supabase (postgres mode)', () => {
	const config = makeConfig({
		database: 'drizzle-supabase',
		projectName: 'my-app',
		supabaseLocalMode: 'postgres',
	})
	const output = generateDotEnv(config)

	it('has PostgreSQL connection string', () => {
		expect(output).toContain(
			'DATABASE_URL=postgresql://magnet:magnet@localhost:5432/my-app',
		)
	})

	it('includes SUPABASE placeholder env vars', () => {
		expect(output).toContain('SUPABASE_URL=')
		expect(output).toContain('SUPABASE_ANON_KEY=')
		expect(output).toContain('SUPABASE_SERVICE_KEY=')
	})
})

describe('generateDotEnv — Vault', () => {
	it('includes VAULT_MASTER_KEY with exact idempotency warning comment', () => {
		const config = makeConfig({ vault: 'db' })
		const output = generateDotEnv(config)
		expect(output).toContain('VAULT_MASTER_KEY=')
		expect(output).toContain(
			'# VAULT_MASTER_KEY: generated at scaffold time — do not regenerate without re-encrypting vault data',
		)
	})

	it('generates a 64-char hex key for VAULT_MASTER_KEY', () => {
		const config = makeConfig({ vault: 'db' })
		const output = generateDotEnv(config)
		const match = output.match(/VAULT_MASTER_KEY=([a-f0-9]+)/)
		expect(match).not.toBeNull()
		expect(match?.[1]?.length).toBe(64) // 32 bytes = 64 hex chars
	})
})
