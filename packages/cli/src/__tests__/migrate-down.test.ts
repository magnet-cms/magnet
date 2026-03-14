import { describe, expect, it, spyOn } from 'bun:test'
import { MigrationRunner } from '@magnet-cms/adapter-db-drizzle'
import { runMigrateDown } from '../commands/migrate-down'

function makeMockRunner(): MigrationRunner {
	return {
		up: async () => ({ applied: 0, names: [], timings: {} }),
		down: async () => undefined,
		status: async () => ({ applied: [], pending: [] }),
	} as unknown as MigrationRunner
}

describe('runMigrateDown', () => {
	it('calls runner.down() with provided migrations', async () => {
		const runner = makeMockRunner()
		const downSpy = spyOn(runner, 'down').mockResolvedValue(undefined)

		const migrations = [
			{ id: '0001_init', timestamp: 1000, async up() {}, async down() {} },
		]
		await runMigrateDown(runner, migrations)

		expect(downSpy).toHaveBeenCalledWith(migrations, undefined)
	})

	it('passes --to option to runner.down()', async () => {
		const runner = makeMockRunner()
		const downSpy = spyOn(runner, 'down').mockResolvedValue(undefined)

		await runMigrateDown(runner, [], { to: '0001_init' })

		expect(downSpy).toHaveBeenCalledWith([], { to: '0001_init' })
	})

	it('propagates errors from runner.down()', async () => {
		const runner = makeMockRunner()
		spyOn(runner, 'down').mockRejectedValue(new Error('rollback failed'))

		await expect(runMigrateDown(runner, [])).rejects.toThrow('rollback failed')
	})
})
