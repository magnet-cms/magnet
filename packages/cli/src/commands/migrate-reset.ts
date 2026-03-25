import type { Migration, MigrationRunner } from '@magnet-cms/adapter-db-drizzle'

export interface ResetOptions {
  force?: boolean
}

/**
 * Core logic for migrate:reset — rollback all migrations then re-apply them.
 * Separated from Commander glue for testability.
 */
export async function runMigrateReset(
  runner: MigrationRunner,
  migrations: Migration[],
  _options: ResetOptions = {},
): Promise<{ rolledBack: number; applied: number }> {
  // Roll back all applied migrations (in reverse order)
  const status = await runner.status(migrations)
  const appliedCount = status.applied.length

  for (let i = 0; i < appliedCount; i++) {
    await runner.down(migrations)
  }

  // Re-apply all migrations
  const result = await runner.up(migrations)

  return { rolledBack: appliedCount, applied: result.applied }
}
