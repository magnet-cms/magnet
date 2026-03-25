import type { Migration, MigrationRunner } from '@magnet-cms/adapter-db-drizzle'

/**
 * Core logic for migrate:down — rollback migrations.
 * Separated from Commander glue for testability.
 */
export async function runMigrateDown(
  runner: MigrationRunner,
  migrations: Migration[],
  options?: { to?: string },
): Promise<void> {
  return runner.down(migrations, options)
}
