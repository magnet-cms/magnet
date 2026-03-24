import { MigrationRunner } from '@magnet-cms/adapter-db-drizzle'
import type { MigrationHistoryRecord } from '@magnet-cms/adapter-db-drizzle'
import { describe, expect, it, vi } from 'vitest'
import { runMigrateStatus } from '../commands/migrate-status'

function makeMockRunner(): MigrationRunner {
	return {
		up: async () => ({ applied: 0, names: [], timings: {} }),
		down: async () => undefined,
		status: async () => ({ applied: [], pending: [] }),
	} as unknown as MigrationRunner
}

function makeHistoryRecord(id: string): MigrationHistoryRecord {
	return {
		id,
		name: id,
		timestamp: 1000,
		appliedAt: new Date('2026-01-01'),
		checksum: 'abc123',
	}
}

describe('runMigrateStatus', () => {
	it('returns empty applied and pending when no migrations', async () => {
		const runner = makeMockRunner()
		const result = await runMigrateStatus(runner, [])

		expect(result.applied).toHaveLength(0)
		expect(result.pending).toHaveLength(0)
	})

	it('returns applied migrations from runner', async () => {
		const runner = makeMockRunner()
		vi.spyOn(runner, 'status').mockResolvedValue({
			applied: [
				makeHistoryRecord('0001_init'),
				makeHistoryRecord('0002_add_users'),
			],
			pending: [],
		})

		const result = await runMigrateStatus(runner, [])

		expect(result.applied).toHaveLength(2)
		expect(result.applied[0].id).toBe('0001_init')
	})

	it('returns pending migrations from runner', async () => {
		const runner = makeMockRunner()
		const pending = [
			{ id: '0003_add_posts', timestamp: 3000, async up() {}, async down() {} },
		]

		vi.spyOn(runner, 'status').mockResolvedValue({
			applied: [makeHistoryRecord('0001_init')],
			pending,
		})

		const result = await runMigrateStatus(runner, pending)

		expect(result.applied).toHaveLength(1)
		expect(result.pending).toHaveLength(1)
		expect(result.pending[0].id).toBe('0003_add_posts')
	})

	it('calls runner.status() with provided migrations', async () => {
		const runner = makeMockRunner()
		const statusSpy = vi.spyOn(runner, 'status').mockResolvedValue({
			applied: [],
			pending: [],
		})

		const migrations = [
			{ id: '0001_init', timestamp: 1000, async up() {}, async down() {} },
		]
		await runMigrateStatus(runner, migrations)

		expect(statusSpy).toHaveBeenCalledWith(migrations)
	})
})
