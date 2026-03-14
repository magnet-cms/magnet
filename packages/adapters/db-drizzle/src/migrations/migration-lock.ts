import { MigrationLockError } from './types'
import type { MigrationDb } from './types'

/**
 * Manages the migration lock table to prevent concurrent migrations.
 * Uses a simple INSERT-based locking with timeout for stale lock cleanup.
 */
export class MigrationLock {
	constructor(
		private readonly db: MigrationDb,
		private readonly tableName: string,
		private readonly lockTimeout: number,
	) {}

	/**
	 * Ensure the lock table exists.
	 */
	async ensureTable(): Promise<void> {
		await this.db.execute(`
			CREATE TABLE IF NOT EXISTS "${this.tableName}" (
				"id" INTEGER NOT NULL DEFAULT 1,
				"locked_at" TEXT NOT NULL,
				"locked_by" TEXT NOT NULL DEFAULT 'unknown',
				CONSTRAINT "${this.tableName}_singleton" CHECK ("id" = 1)
			)
		`)
	}

	/**
	 * Check if a valid (non-expired) lock exists.
	 */
	async isLocked(): Promise<boolean> {
		const result = (await this.db.execute(
			`SELECT "locked_at" FROM "${this.tableName}" WHERE "id" = 1`,
		)) as { rows: Record<string, unknown>[] }
		const rows =
			result?.rows ?? (result as unknown as Record<string, unknown>[])
		const arr = Array.isArray(rows) ? rows : []
		if (arr.length === 0) return false
		const lockedAt = new Date(String(arr[0]?.locked_at))
		const age = Date.now() - lockedAt.getTime()
		return age < this.lockTimeout
	}

	/**
	 * Acquire the migration lock.
	 * Cleans up stale locks (older than lockTimeout) before attempting to lock.
	 * Throws MigrationLockError if another valid lock exists.
	 */
	async acquire(): Promise<void> {
		// Clean up stale locks first
		const expireTime = new Date(Date.now() - this.lockTimeout).toISOString()
		await this.db.execute(
			`DELETE FROM "${this.tableName}" WHERE "locked_at" < '${expireTime}'`,
		)

		const locked = await this.isLocked()
		if (locked) {
			throw new MigrationLockError()
		}

		// Delete any remaining rows and insert a fresh lock
		await this.db.execute(`DELETE FROM "${this.tableName}"`)
		await this.db.execute(
			`INSERT INTO "${this.tableName}" ("id", "locked_at", "locked_by") VALUES (1, '${new Date().toISOString()}', 'magnet-migrations')`,
		)
	}

	/**
	 * Release the migration lock.
	 */
	async release(): Promise<void> {
		await this.db.execute(`DELETE FROM "${this.tableName}"`)
	}
}
