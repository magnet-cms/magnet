import type {
	Migration,
	MigrationDb,
	MigrationRunner,
} from '@magnet-cms/adapter-drizzle'

/**
 * Core logic for migrate:fresh — drop all tables directly, then re-apply migrations.
 * Separated from Commander glue for testability.
 */
export async function runMigrateFresh(
	db: MigrationDb,
	runner: MigrationRunner,
	tables: string[],
	migrations: Migration[],
): Promise<{ dropped: number; applied: number }> {
	// Drop each table directly (no down migrations)
	for (const table of tables) {
		await db.execute(`DROP TABLE IF EXISTS "${table}" CASCADE`)
	}

	// Re-apply all migrations from scratch
	const result = await runner.up(migrations)

	return { dropped: tables.length, applied: result.applied }
}
