import type { Migration, MigrationResult, MigrationRunner } from '@magnet-cms/adapter-db-drizzle'

/**
 * Core logic for migrate:up — apply all pending migrations.
 * Separated from Commander glue for testability.
 */
export async function runMigrateUp(
  runner: MigrationRunner,
  migrations: Migration[],
  options?: { to?: string },
): Promise<MigrationResult> {
  return runner.up(migrations, options)
}
