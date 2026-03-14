import { MigrationHistory } from './migration-history'
import { MigrationLock } from './migration-lock'
import { MigrationChecksumError } from './types'
import type {
	Migration,
	MigrationConfig,
	MigrationDb,
	MigrationHistoryRecord,
	MigrationResult,
} from './types'

/**
 * Orchestrates migration execution: acquires lock, validates checksums,
 * runs pending migrations in order, and releases lock on completion or error.
 */
export class MigrationRunner {
	private readonly history: MigrationHistory
	private readonly lock: MigrationLock

	constructor(
		private readonly db: MigrationDb,
		private readonly config: MigrationConfig,
	) {
		this.history = new MigrationHistory(db, config.tableName)
		this.lock = new MigrationLock(db, config.lockTableName, config.lockTimeout)
	}

	/**
	 * Apply all pending migrations (or up to a specific migration ID).
	 */
	async up(
		migrations: Migration[],
		options?: { to?: string },
	): Promise<MigrationResult> {
		await this.history.ensureTable()
		await this.lock.ensureTable()
		await this.lock.acquire()

		try {
			const applied = await this.history.getApplied()
			const appliedMap = new Map(applied.map((r) => [r.id, r]))

			// Validate checksums of already-applied migrations
			for (const migration of migrations) {
				const record = appliedMap.get(migration.id)
				if (record) {
					const checksum = MigrationHistory.calculateChecksum(
						migration.up,
						migration.down,
					)
					if (checksum !== record.checksum) {
						throw new MigrationChecksumError(
							migration.id,
							record.checksum,
							checksum,
						)
					}
				}
			}

			// Determine pending migrations
			const pending = migrations
				.filter((m) => !appliedMap.has(m.id))
				.sort((a, b) => a.timestamp - b.timestamp)

			const result: MigrationResult = { applied: 0, names: [], timings: {} }

			for (const migration of pending) {
				if (options?.to && migration.id > options.to) break

				const start = Date.now()

				const record: MigrationHistoryRecord = {
					id: migration.id,
					name: migration.id,
					timestamp: migration.timestamp,
					appliedAt: new Date(),
					checksum: MigrationHistory.calculateChecksum(
						migration.up,
						migration.down,
					),
				}

				if (this.config.transactional) {
					await this.db.execute('BEGIN')
					try {
						await migration.up(this.db)
						await this.history.recordMigration(record)
						await this.db.execute('COMMIT')
					} catch (err) {
						await this.db.execute('ROLLBACK')
						throw err
					}
				} else {
					await migration.up(this.db)
					await this.history.recordMigration(record)
				}

				const elapsed = Date.now() - start
				result.applied++
				result.names.push(migration.id)
				result.timings[migration.id] = elapsed
			}

			return result
		} finally {
			await this.lock.release()
		}
	}

	/**
	 * Roll back applied migrations. Without options, rolls back the last one.
	 * With options.to, rolls back all migrations after the target (exclusive).
	 */
	async down(
		migrations: Migration[],
		options?: { to?: string },
	): Promise<void> {
		await this.history.ensureTable()
		await this.lock.ensureTable()
		await this.lock.acquire()

		try {
			let applied = await this.history.getApplied()

			while (applied.length > 0) {
				const last = applied[applied.length - 1]
				if (!last) break

				// Stop if we've reached the target
				if (options?.to && last.id <= options.to) break

				const migration = migrations.find((m) => m.id === last.id)
				if (!migration) break

				if (this.config.transactional) {
					await this.db.execute('BEGIN')
					try {
						await migration.down(this.db)
						await this.history.removeMigration(last.id)
						await this.db.execute('COMMIT')
					} catch (err) {
						await this.db.execute('ROLLBACK')
						throw err
					}
				} else {
					await migration.down(this.db)
					await this.history.removeMigration(last.id)
				}

				// Without a target, only roll back one migration
				if (!options?.to) break

				// Re-fetch for next iteration
				applied = await this.history.getApplied()
			}
		} finally {
			await this.lock.release()
		}
	}

	/**
	 * Return the current migration status.
	 */
	async status(
		migrations: Migration[],
	): Promise<{ applied: MigrationHistoryRecord[]; pending: Migration[] }> {
		await this.history.ensureTable()
		await this.lock.ensureTable()

		const applied = await this.history.getApplied()
		const appliedIds = new Set(applied.map((r) => r.id))
		const pending = migrations.filter((m) => !appliedIds.has(m.id))

		return { applied, pending }
	}
}
