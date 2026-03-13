import { beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { Adapter } from '../drizzle.adapter'

// Reset adapter state between tests by casting to access private fields
function resetAdapter() {
	const a = Adapter as unknown as Record<string, unknown>
	a.db = null
	a.options = null
	a.tablesInitialized = false
	a.schemaRegistry = new Map()
}

describe('DrizzleAdapter.ensureTablesCreated', () => {
	beforeEach(() => resetAdapter())

	it('does nothing when db is null', async () => {
		// No db set — should return early without error
		await expect(Adapter.ensureTablesCreated()).resolves.toBeUndefined()
	})

	it('does nothing when schemaRegistry is empty', async () => {
		const a = Adapter as unknown as Record<string, unknown>
		a.db = {} // simulate a connected db
		// schemaRegistry is empty (size 0)
		await expect(Adapter.ensureTablesCreated()).resolves.toBeUndefined()
	})

	it('calls legacy createTables when no migrations config', async () => {
		const a = Adapter as unknown as Record<string, unknown>
		a.db = {}
		a.options = { db: { connectionString: 'postgresql://localhost/test' } }
		;(a.schemaRegistry as Map<string, unknown>).set('Test', {
			table: {},
			tableName: 'tests',
		})

		const createTablesSpy = spyOn(
			Adapter as unknown as { createTables: () => Promise<void> },
			'createTables',
		).mockResolvedValue(undefined)
		const runAutoSpy = spyOn(
			Adapter as unknown as { runAutoMigration: (c: unknown) => Promise<void> },
			'runAutoMigration',
		).mockResolvedValue(undefined)

		await Adapter.ensureTablesCreated()

		expect(createTablesSpy).toHaveBeenCalled()
		expect(runAutoSpy).not.toHaveBeenCalled()

		createTablesSpy.mockRestore()
		runAutoSpy.mockRestore()
	})

	it('calls runAutoMigration when migrations config is present', async () => {
		const a = Adapter as unknown as Record<string, unknown>
		a.db = {}
		a.options = {
			db: {
				connectionString: 'postgresql://localhost/test',
				migrations: { mode: 'manual', directory: './migrations' },
			},
		}
		;(a.schemaRegistry as Map<string, unknown>).set('Test', {
			table: {},
			tableName: 'tests',
		})

		const createTablesSpy = spyOn(
			Adapter as unknown as { createTables: () => Promise<void> },
			'createTables',
		).mockResolvedValue(undefined)
		const runAutoSpy = spyOn(
			Adapter as unknown as { runAutoMigration: (c: unknown) => Promise<void> },
			'runAutoMigration',
		).mockResolvedValue(undefined)

		await Adapter.ensureTablesCreated()

		expect(runAutoSpy).toHaveBeenCalled()
		expect(createTablesSpy).not.toHaveBeenCalled()

		createTablesSpy.mockRestore()
		runAutoSpy.mockRestore()
	})

	it('sets tablesInitialized = true after running', async () => {
		const a = Adapter as unknown as Record<string, unknown>
		a.db = {}
		a.options = { db: { connectionString: 'postgresql://localhost/test' } }
		;(a.schemaRegistry as Map<string, unknown>).set('Test', {
			table: {},
			tableName: 'tests',
		})

		spyOn(
			Adapter as unknown as { createTables: () => Promise<void> },
			'createTables',
		).mockResolvedValue(undefined)

		await Adapter.ensureTablesCreated()

		expect(a.tablesInitialized).toBe(true)
	})
})
