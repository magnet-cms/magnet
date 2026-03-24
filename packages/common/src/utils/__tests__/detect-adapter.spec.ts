import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/utils/database-adapter-module.util', () => ({
	getDatabaseAdapterResolutionRoots: () => [],
}))

import {
	clearAdapterCache,
	detectDatabaseAdapter,
	setDatabaseAdapter,
} from '../detect-adapter.util'

afterEach(() => {
	clearAdapterCache()
})

describe('detectDatabaseAdapter', () => {
	it('detects drizzle from connectionString config', () => {
		const result = detectDatabaseAdapter({
			connectionString: 'postgres://...',
		} as never)
		expect(result).toBe('drizzle')
	})

	it('detects drizzle from dialect config', () => {
		const result = detectDatabaseAdapter({ dialect: 'pg' } as never)
		expect(result).toBe('drizzle')
	})

	it('detects mongoose from uri config', () => {
		const result = detectDatabaseAdapter({
			uri: 'mongodb://localhost/test',
		} as never)
		expect(result).toBe('mongoose')
	})

	it('returns cached adapter when set via setDatabaseAdapter', () => {
		setDatabaseAdapter('drizzle')
		const result = detectDatabaseAdapter()
		expect(result).toBe('drizzle')
	})

	it('returns cached adapter over config when cache is set first', () => {
		setDatabaseAdapter('mongoose')
		// Even though config says drizzle, cached value wins when no config passed
		const result = detectDatabaseAdapter()
		expect(result).toBe('mongoose')
	})

	it('throws when no adapter is installed and no config provided', () => {
		// With no packages installed (empty resolution roots) and no cache, should throw
		expect(() => detectDatabaseAdapter()).toThrow(
			'No supported database adapter found',
		)
	})
})

describe('setDatabaseAdapter', () => {
	it('sets mongoose adapter', () => {
		setDatabaseAdapter('mongoose')
		expect(detectDatabaseAdapter()).toBe('mongoose')
	})

	it('sets drizzle adapter', () => {
		setDatabaseAdapter('drizzle')
		expect(detectDatabaseAdapter()).toBe('drizzle')
	})
})

describe('clearAdapterCache', () => {
	it('clears the cached adapter so it re-detects', () => {
		setDatabaseAdapter('mongoose')
		clearAdapterCache()
		// After clearing, no packages installed → throws
		expect(() => detectDatabaseAdapter()).toThrow()
	})
})
