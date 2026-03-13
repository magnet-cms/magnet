import type {
	Migration,
	MigrationHistoryRecord,
	MigrationRunner,
} from '@magnet-cms/adapter-drizzle'

export interface MigrateStatusResult {
	applied: MigrationHistoryRecord[]
	pending: Migration[]
}

/**
 * Core logic for migrate:status — show applied and pending migrations.
 * Separated from Commander glue for testability.
 */
export async function runMigrateStatus(
	runner: MigrationRunner,
	migrations: Migration[],
): Promise<MigrateStatusResult> {
	return runner.status(migrations)
}
