import { afterEach, describe, expect, it } from 'vitest'
import { ConfigLoader } from '../utils/config-loader'

describe('ConfigLoader', () => {
	const originalEnv = { ...process.env }

	afterEach(() => {
		if ('DATABASE_URL' in originalEnv) {
			process.env.DATABASE_URL = originalEnv.DATABASE_URL
		} else {
			process.env.DATABASE_URL = undefined
		}
	})

	it('loads DATABASE_URL from environment when no config file exists', async () => {
		process.env.DATABASE_URL = 'postgresql://localhost:5432/test'

		const loader = new ConfigLoader('/nonexistent-dir')
		const config = await loader.load()

		expect(config.databaseUrl).toBe('postgresql://localhost:5432/test')
	})

	it('throws when no config file and no DATABASE_URL', async () => {
		process.env.DATABASE_URL = undefined

		const loader = new ConfigLoader('/nonexistent-dir')
		await expect(loader.load()).rejects.toThrow('DATABASE_URL')
	})

	it('normalizes raw config with databaseUrl field', () => {
		process.env.DATABASE_URL = undefined

		const loader = new ConfigLoader('/nonexistent-dir')
		// @ts-expect-error accessing private for testing
		const result = loader.normalizeConfig({
			databaseUrl: 'postgresql://localhost/mydb',
			dialect: 'postgresql',
		})

		expect(result.databaseUrl).toBe('postgresql://localhost/mydb')
		expect(result.dialect).toBe('postgresql')
	})

	it('normalizeConfig throws when no databaseUrl and no env var', () => {
		process.env.DATABASE_URL = undefined

		const loader = new ConfigLoader('/nonexistent-dir')
		// @ts-expect-error accessing private for testing
		expect(() => loader.normalizeConfig({})).toThrow('databaseUrl')
	})

	it('normalizeConfig uses DATABASE_URL fallback when not in config', () => {
		process.env.DATABASE_URL = 'postgresql://env-url/db'

		const loader = new ConfigLoader('/nonexistent-dir')
		// @ts-expect-error accessing private for testing
		const result = loader.normalizeConfig({})

		expect(result.databaseUrl).toBe('postgresql://env-url/db')
	})
})
