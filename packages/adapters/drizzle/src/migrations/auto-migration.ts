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
		const diffResult = await this.diff.diff(dialect)

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
					await db.execute(sql)
				}
			},
			async down(_db) {
				// Down migration not auto-generated — apply manually if needed
			},
		}

		const result = await this.runner.up([migration])
		logger.log(`Auto-migration applied: ${result.applied} migration(s)`)
	}
}
