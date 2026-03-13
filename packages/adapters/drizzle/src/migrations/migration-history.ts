import { createHash } from 'node:crypto'
import type { MigrationDb, MigrationHistoryRecord } from './types'

/**
 * Manages the migration history table (_magnet_migrations).
 * Tracks which migrations have been applied, records checksums for validation.
 */
export class MigrationHistory {
	constructor(
		private readonly db: MigrationDb,
		private readonly tableName: string,
	) {}

	/**
	 * Ensure the migrations history table exists.
	 */
	async ensureTable(): Promise<void> {
		await this.db.execute(`
			CREATE TABLE IF NOT EXISTS "${this.tableName}" (
				"id" TEXT NOT NULL PRIMARY KEY,
				"name" TEXT NOT NULL,
				"timestamp" BIGINT NOT NULL,
				"applied_at" TEXT NOT NULL,
				"checksum" TEXT NOT NULL
			)
		`)
	}

	/**
	 * Get all applied migrations ordered by timestamp.
	 */
	async getApplied(): Promise<MigrationHistoryRecord[]> {
		const result = (await this.db.execute(
			`SELECT * FROM "${this.tableName}" ORDER BY "timestamp" ASC`,
		)) as { rows: Record<string, unknown>[] }
		const rows =
			result?.rows ?? (result as unknown as Record<string, unknown>[])
		const arr = Array.isArray(rows) ? rows : []
		return arr.map((row) => ({
			id: String(row.id),
			name: String(row.name),
			timestamp: Number(row.timestamp),
			appliedAt: new Date(String(row.applied_at)),
			checksum: String(row.checksum),
		}))
	}

	/**
	 * Record a newly applied migration.
	 */
	async recordMigration(record: MigrationHistoryRecord): Promise<void> {
		// Escape single quotes in string values to prevent SQL injection
		const esc = (v: string) => v.replace(/'/g, "''")
		await this.db.execute(
			`INSERT INTO "${this.tableName}" ("id", "name", "timestamp", "applied_at", "checksum") VALUES ('${esc(record.id)}', '${esc(record.name)}', ${record.timestamp}, '${esc(record.appliedAt.toISOString())}', '${esc(record.checksum)}')`,
		)
	}

	/**
	 * Remove a migration record (for rollback).
	 */
	async removeMigration(id: string): Promise<void> {
		const esc = (v: string) => v.replace(/'/g, "''")
		await this.db.execute(
			`DELETE FROM "${this.tableName}" WHERE "id" = '${esc(id)}'`,
		)
	}

	/**
	 * Calculate a 16-char checksum (SHA-256 truncated) for a migration's up+down functions.
	 */
	static calculateChecksum(
		up: (db: MigrationDb) => Promise<void>,
		down: (db: MigrationDb) => Promise<void>,
	): string {
		const content = up.toString() + down.toString()
		return createHash('sha256').update(content).digest('hex').slice(0, 16)
	}
}
