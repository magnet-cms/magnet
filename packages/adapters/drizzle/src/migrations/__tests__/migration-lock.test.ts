import { describe, expect, it } from 'bun:test'
import { MigrationLock } from '../migration-lock'
import { MigrationLockError } from '../types'
import type { MigrationDb } from '../types'

function makeMockDb(isLocked = false): { db: MigrationDb; executed: string[] } {
	const executed: string[] = []
	const db: MigrationDb = {
		async execute(sql: string) {
			executed.push(sql)
			if (sql.includes('SELECT') && sql.includes('lock')) {
				return {
					rows: isLocked ? [{ locked_at: new Date().toISOString() }] : [],
				}
			}
			return { rows: [] }
		},
	}
	return { db, executed }
}

describe('MigrationLock', () => {
	it('ensureTable() creates lock table', async () => {
		const { db, executed } = makeMockDb()
		const lock = new MigrationLock(db, '_magnet_migrations_lock', 30000)
		await lock.ensureTable()
		expect(executed.length).toBe(1)
		expect(executed[0]).toContain('CREATE TABLE IF NOT EXISTS')
		expect(executed[0]).toContain('_magnet_migrations_lock')
	})

	it('acquire() inserts a lock row when not locked', async () => {
		const { db, executed } = makeMockDb(false)
		const lock = new MigrationLock(db, '_magnet_migrations_lock', 30000)
		await lock.acquire()
		const insertSql = executed.find((s) => s.includes('INSERT'))
		expect(insertSql).toBeDefined()
	})

	it('acquire() throws MigrationLockError when locked', async () => {
		const { db } = makeMockDb(true)
		const lock = new MigrationLock(db, '_magnet_migrations_lock', 30000)
		await expect(lock.acquire()).rejects.toBeInstanceOf(MigrationLockError)
	})

	it('release() deletes the lock row', async () => {
		const { db, executed } = makeMockDb()
		const lock = new MigrationLock(db, '_magnet_migrations_lock', 30000)
		await lock.release()
		const deleteSql = executed.find((s) => s.includes('DELETE'))
		expect(deleteSql).toBeDefined()
	})

	it('isLocked() returns false when no lock exists', async () => {
		const { db } = makeMockDb(false)
		const lock = new MigrationLock(db, '_magnet_migrations_lock', 30000)
		const locked = await lock.isLocked()
		expect(locked).toBe(false)
	})

	it('isLocked() returns true when lock exists', async () => {
		const { db } = makeMockDb(true)
		const lock = new MigrationLock(db, '_magnet_migrations_lock', 30000)
		const locked = await lock.isLocked()
		expect(locked).toBe(true)
	})
})
