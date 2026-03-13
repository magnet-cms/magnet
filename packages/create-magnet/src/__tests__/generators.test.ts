import { describe, expect, it } from 'bun:test'
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
		includeExample: false,
		packageManager: 'npm',
		...overrides,
	}
}

describe('generatePackageJson (Drizzle)', () => {
	it('includes @magnet-cms/cli in devDependencies for drizzle projects', () => {
		const json = JSON.parse(
			generatePackageJson(makeConfig({ database: 'drizzle-neon' })),
		)
		expect(json.devDependencies['@magnet-cms/cli']).toBeDefined()
	})

	it('includes migrate scripts for drizzle projects', () => {
		const json = JSON.parse(
			generatePackageJson(makeConfig({ database: 'drizzle-neon' })),
		)
		expect(json.scripts['migrate:up']).toBe('magnet migrate:up')
		expect(json.scripts['migrate:down']).toBe('magnet migrate:down')
		expect(json.scripts['migrate:status']).toBe('magnet migrate:status')
		expect(json.scripts['migrate:generate']).toBe('magnet migrate:generate')
	})

	it('does NOT include @magnet-cms/cli for mongoose projects', () => {
		const json = JSON.parse(
			generatePackageJson(makeConfig({ database: 'mongoose' })),
		)
		expect(json.devDependencies['@magnet-cms/cli']).toBeUndefined()
	})

	it('does NOT include migrate scripts for mongoose projects', () => {
		const json = JSON.parse(
			generatePackageJson(makeConfig({ database: 'mongoose' })),
		)
		expect(json.scripts['migrate:up']).toBeUndefined()
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
