import { Logger } from '@nestjs/common'
import type { MigrationGenerator } from './migration-generator'
import type { MigrationRunner } from './migration-runner'
import type { SchemaBridge } from './schema-bridge'
import type { SchemaDiff } from './schema-diff'
import type { MigrationConfig, MigrationDialect } from './types'

const logger = new Logger('AutoMigration')

/**
 * Handles automatic migration detection and application on adapter startup.
 *
 * In `auto` mode:  detects diff → generates migration file → applies it.
 * In `manual` mode: detects diff → logs warning only (does not apply).
 * No `migrations` config: caller falls back to legacy CREATE TABLE IF NOT EXISTS.
 */
export class AutoMigration {
	constructor(
		private readonly bridge: SchemaBridge,
		private readonly diff: SchemaDiff,
		private readonly gen: MigrationGenerator,
		private readonly runner: MigrationRunner,
	) {}

	/**
	 * Check for schema changes and handle them based on the migration mode.
	 */
	async run(
		dialect: MigrationDialect,
		config: MigrationConfig,
		directory: string,
	): Promise<void> {
		const prevSnapshot = await this.bridge.loadSnapshot(directory)
		const diffResult = await this.diff.diff(dialect, prevSnapshot ?? undefined)

		if (diffResult.isEmpty) {
			return
		}

		if (config.mode === 'manual') {
			logger.warn(
				`${diffResult.upSQL.length} pending schema change(s) detected. Run \`magnet migrate:generate\` to create a migration file, then \`magnet migrate:up\` to apply it.`,
			)
			return
		}

		// auto mode: generate + apply
		if (diffResult.dangerous) {
			for (const warning of diffResult.warnings) {
				logger.warn(`⚠ Dangerous schema change: ${warning}`)
			}
		}

		const timestamp = Date.now()
		const migrationId = `${timestamp}_auto_migration`
		const upSQL = diffResult.upSQL

		const content = this.gen.generate('auto_migration', upSQL, [], {
			dangerous: diffResult.dangerous,
			warnings: diffResult.warnings,
		})

		const { filename } = await this.gen.writeMigrationFile(
			directory,
			'auto_migration',
			content,
		)
		logger.log(`Auto-migration file created: ${filename}`)

		// Construct migration object in-memory (avoids dynamic file import)
		const migration: import('./types').Migration = {
			id: migrationId,
			timestamp,
			dangerous: diffResult.dangerous,
			warnings: diffResult.warnings,
			async up(db) {
				for (const sql of upSQL) {
					try {
						await db.execute(sql)
					} catch (err) {
						const msg = err instanceof Error ? err.message : String(err)
						const code =
							err && typeof err === 'object' && 'code' in err
								? (err as { code?: string }).code
								: undefined
						// PostgreSQL 42P07 (table), 42710 (type/object); MySQL ER_TABLE_EXISTS; SQLite duplicate
						if (
							code === '42P07' ||
							code === '42710' ||
							msg.includes('already exists') ||
							msg.includes('ER_TABLE_EXISTS') ||
							msg.includes('duplicate table name') ||
							msg.includes('duplicate key value')
						) {
							logger.warn(
								`Skipping (object already exists): ${msg.slice(0, 80)}`,
							)
							continue
						}
						throw err
					}
				}
			},
			async down(_db) {
				// Down migration not auto-generated — apply manually if needed
			},
		}

		const result = await this.runner.up([migration])
		logger.log(`Auto-migration applied: ${result.applied} migration(s)`)

		await this.bridge.saveSnapshot(directory, diffResult.currentSnapshot)
	}
}
