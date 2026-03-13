import { describe, expect, it, spyOn } from 'bun:test'
import { MigrationRunner } from '@magnet-cms/adapter-drizzle'
import type { MigrationDb } from '@magnet-cms/adapter-drizzle'
import { runMigrateFresh } from '../commands/migrate-fresh'

function makeMockDb(): MigrationDb {
	return {
		async execute(_sql: string) {
			return { rows: [] }
		},
	}
}

function makeMockRunner(): MigrationRunner {
	return {
		up: async () => ({ applied: 0, names: [], timings: {} }),
		down: async () => undefined,
		status: async () => ({ applied: [], pending: [] }),
	} as unknown as MigrationRunner
}

describe('runMigrateFresh', () => {
	it('drops all provided tables and re-applies migrations', async () => {
		const db = makeMockDb()
		const runner = makeMockRunner()
		const executeSpy = spyOn(db, 'execute').mockResolvedValue({ rows: [] })
		const upSpy = spyOn(runner, 'up').mockResolvedValue({
			applied: 2,
			names: ['0001_init', '0002_users'],
			timings: {},
		})

		const result = await runMigrateFresh(db, runner, ['users', 'posts'], [])

		// Should have executed DROP TABLE for each table
		const dropCalls = executeSpy.mock.calls.filter(
			([sql]) => typeof sql === 'string' && sql.includes('DROP TABLE'),
		)
		expect(dropCalls.length).toBe(2)
		expect(upSpy).toHaveBeenCalledTimes(1)
		expect(result.dropped).toBe(2)
		expect(result.applied).toBe(2)
	})

	it('returns 0 dropped when no tables provided', async () => {
		const db = makeMockDb()
		const runner = makeMockRunner()
		spyOn(db, 'execute').mockResolvedValue({ rows: [] })
		spyOn(runner, 'up').mockResolvedValue({
			applied: 0,
			names: [],
			timings: {},
		})

		const result = await runMigrateFresh(db, runner, [], [])

		expect(result.dropped).toBe(0)
	})
})
