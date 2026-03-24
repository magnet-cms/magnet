import { describe, expect, it } from 'vitest'
import { generateAppModule } from '../generators/app-module.js'
import { generatePackageJson } from '../generators/package-json.js'
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

describe('generatePackageJson — CLI inclusion', () => {
	it('includes @magnet-cms/cli in devDependencies for drizzle projects', () => {
		const json = JSON.parse(
			generatePackageJson(makeConfig({ database: 'drizzle-neon' })),
		)
		expect(json.devDependencies['@magnet-cms/cli']).toBeDefined()
	})

	it('includes @magnet-cms/cli in devDependencies for mongoose projects', () => {
		const json = JSON.parse(
			generatePackageJson(makeConfig({ database: 'mongoose' })),
		)
		expect(json.devDependencies['@magnet-cms/cli']).toBeDefined()
	})
})

describe('generatePackageJson — migrate scripts', () => {
	it('uses space-separated format for drizzle projects', () => {
		const json = JSON.parse(
			generatePackageJson(makeConfig({ database: 'drizzle-neon' })),
		)
		expect(json.scripts['migrate:up']).toBe('magnet migrate up')
		expect(json.scripts['migrate:down']).toBe('magnet migrate down')
		expect(json.scripts['migrate:status']).toBe('magnet migrate status')
		expect(json.scripts['migrate:generate']).toBe('magnet migrate generate')
		expect(json.scripts['migrate:create']).toBe('magnet migrate create')
	})

	it('does NOT include migrate scripts for mongoose projects', () => {
		const json = JSON.parse(
			generatePackageJson(makeConfig({ database: 'mongoose' })),
		)
		expect(json.scripts['migrate:up']).toBeUndefined()
	})
})

describe('generatePackageJson — dev/docker scripts', () => {
	it('uses magnet dev as the dev script', () => {
		const json = JSON.parse(generatePackageJson(makeConfig()))
		expect(json.scripts.dev).toBe('magnet dev')
	})

	it('includes dev:app for direct NestJS start', () => {
		const json = JSON.parse(generatePackageJson(makeConfig()))
		expect(json.scripts['dev:app']).toBe('nest start --watch')
	})

	it('uses magnet docker commands', () => {
		const json = JSON.parse(generatePackageJson(makeConfig()))
		expect(json.scripts['docker:up']).toBe('magnet docker up')
		expect(json.scripts['docker:down']).toBe('magnet docker down')
		expect(json.scripts['docker:logs']).toBe('magnet docker logs')
	})

	it('includes db:reset script', () => {
		const json = JSON.parse(generatePackageJson(makeConfig()))
		expect(json.scripts['db:reset']).toBe('magnet db:reset')
	})
})

describe('generateAppModule (Drizzle)', () => {
	it('includes migrations config for drizzle-neon projects', () => {
		const content = generateAppModule(makeConfig({ database: 'drizzle-neon' }))
		expect(content).toContain('migrations:')
		expect(content).toContain('mode:')
		expect(content).toContain("directory: './migrations'")
	})

	it('includes migrations config for drizzle-supabase projects', () => {
		const content = generateAppModule(
			makeConfig({ database: 'drizzle-supabase' }),
		)
		expect(content).toContain('migrations:')
		expect(content).toContain("directory: './migrations'")
	})

	it('does NOT include migrations config for mongoose projects', () => {
		const content = generateAppModule(makeConfig({ database: 'mongoose' }))
		expect(content).not.toContain('migrations:')
	})
})
