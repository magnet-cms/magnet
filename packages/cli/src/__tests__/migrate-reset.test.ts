import { describe, expect, it, spyOn } from 'bun:test'
import { MigrationRunner } from '@magnet-cms/adapter-drizzle'
import type { MigrationHistoryRecord } from '@magnet-cms/adapter-drizzle'
import { runMigrateReset } from '../commands/migrate-reset'

function makeMockRunner(appliedIds: string[] = []): MigrationRunner {
	const applied: MigrationHistoryRecord[] = appliedIds.map((id) => ({
		id,
		name: id,
		timestamp: 1000,
		appliedAt: new Date(),
		checksum: 'abc',
	}))
	return {
		up: async () => ({ applied: 0, names: [], timings: {} }),
		down: async () => undefined,
		status: async () => ({ applied, pending: [] }),
	} as unknown as MigrationRunner
}

describe('runMigrateReset', () => {
	it('rolls back all applied migrations and re-applies', async () => {
		const runner = makeMockRunner(['0001_init', '0002_users'])
		const downSpy = spyOn(runner, 'down').mockResolvedValue(undefined)
		const upSpy = spyOn(runner, 'up').mockResolvedValue({
			applied: 2,
			names: ['0001_init', '0002_users'],
			timings: {},
		})

		const result = await runMigrateReset(runner, [])

		expect(downSpy).toHaveBeenCalledTimes(2)
		expect(upSpy).toHaveBeenCalledTimes(1)
		expect(result.rolledBack).toBe(2)
		expect(result.applied).toBe(2)
	})

	it('returns 0 rolledBack when no migrations applied', async () => {
		const runner = makeMockRunner([])
		const downSpy = spyOn(runner, 'down').mockResolvedValue(undefined)
		spyOn(runner, 'up').mockResolvedValue({
			applied: 0,
			names: [],
			timings: {},
		})

		const result = await runMigrateReset(runner, [])

		expect(downSpy).not.toHaveBeenCalled()
		expect(result.rolledBack).toBe(0)
	})
})
