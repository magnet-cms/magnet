import type {
  DEFAULT_MIGRATION_CONFIG as DefaultMigrationConfigType,
  MigrationRunner as MigrationRunnerType,
} from '@magnet-cms/adapter-db-drizzle'
import ansis from 'ansis'
import type { Command } from 'commander'

import { ConfigLoader } from '../utils/config-loader'
import { createConnection } from '../utils/connection'
import { loadMigrationsFromDirectory } from '../utils/migration-loader'

/**
 * The subset of the drizzle adapter module used by migration commands.
 * Typed via `import type` — erased at compile time, no runtime dependency.
 */
export interface DrizzleAdapterModule {
  DEFAULT_MIGRATION_CONFIG: typeof DefaultMigrationConfigType
  MigrationRunner: typeof MigrationRunnerType
  SchemaBridge: new () => object
  SchemaDiff: new (bridge: unknown) => object
  MigrationGenerator: new () => object
}

export function registerMigrateCommands(program: Command, drizzle: DrizzleAdapterModule): void {
  const { DEFAULT_MIGRATION_CONFIG, MigrationRunner } = drizzle

  const migrate = program.command('migrate').description('Database migration commands')

  migrate
    .command('up')
    .description('Apply all pending migrations')
    .option('--to <id>', 'Apply migrations up to (and including) this migration ID')
    .action(async (opts: { to?: string }) => {
      try {
        const { runMigrateUp } = await import('./migrate-up')
        const config = await new ConfigLoader().load()
        const db = await createConnection(config.databaseUrl)
        const migrationConfig = {
          ...DEFAULT_MIGRATION_CONFIG,
          ...config.migrations,
        }
        const runner = new MigrationRunner(db, migrationConfig)

        console.log(ansis.cyan('Running migrations...'))
        const result = await runMigrateUp(
          runner,
          await loadMigrationsFromDirectory(migrationConfig.directory),
          opts,
        )

        if (result.applied === 0) {
          console.log(ansis.green('✓ No pending migrations'))
        } else {
          console.log(ansis.green(`✓ Applied ${result.applied} migration(s):`))
          for (const name of result.names) {
            const ms = result.timings[name]
            console.log(`  ${ansis.dim('→')} ${name} ${ansis.dim(`(${ms}ms)`)}`)
          }
        }
        process.exit(0)
      } catch (err) {
        console.error(ansis.red('✗ Migration failed:'), err instanceof Error ? err.message : err)
        process.exit(1)
      }
    })

  migrate
    .command('down')
    .description('Roll back the last applied migration')
    .option('--to <id>', 'Roll back to (and including) this migration ID')
    .action(async (opts: { to?: string }) => {
      try {
        const { runMigrateDown } = await import('./migrate-down')
        const config = await new ConfigLoader().load()
        const db = await createConnection(config.databaseUrl)
        const migrationConfig = {
          ...DEFAULT_MIGRATION_CONFIG,
          ...config.migrations,
        }
        const runner = new MigrationRunner(db, migrationConfig)

        console.log(ansis.cyan('Rolling back migration...'))
        await runMigrateDown(
          runner,
          await loadMigrationsFromDirectory(migrationConfig.directory),
          opts,
        )
        console.log(ansis.green('✓ Rollback complete'))
        process.exit(0)
      } catch (err) {
        console.error(ansis.red('✗ Rollback failed:'), err instanceof Error ? err.message : err)
        process.exit(1)
      }
    })

  migrate
    .command('status')
    .description('Show migration status')
    .action(async () => {
      try {
        const { runMigrateStatus } = await import('./migrate-status')
        const config = await new ConfigLoader().load()
        const db = await createConnection(config.databaseUrl)
        const migrationConfig = {
          ...DEFAULT_MIGRATION_CONFIG,
          ...config.migrations,
        }
        const runner = new MigrationRunner(db, migrationConfig)

        const { applied, pending } = await runMigrateStatus(
          runner,
          await loadMigrationsFromDirectory(migrationConfig.directory),
        )

        console.log(ansis.bold('Migration Status'))
        console.log(ansis.dim('─'.repeat(50)))

        if (applied.length === 0 && pending.length === 0) {
          console.log(ansis.dim('  No migrations found'))
        }

        for (const record of applied) {
          console.log(
            `  ${ansis.green('✓')} ${record.id} ${ansis.dim(`(applied ${record.appliedAt.toLocaleDateString()})`)}`,
          )
        }
        for (const migration of pending) {
          console.log(`  ${ansis.yellow('○')} ${migration.id} ${ansis.dim('(pending)')}`)
        }

        console.log(ansis.dim('─'.repeat(50)))
        console.log(
          `  Applied: ${ansis.green(String(applied.length))}  Pending: ${ansis.yellow(String(pending.length))}`,
        )
        process.exit(0)
      } catch (err) {
        console.error(ansis.red('✗ Status check failed:'), err instanceof Error ? err.message : err)
        process.exit(1)
      }
    })

  migrate
    .command('generate [name]')
    .description('Generate a migration file from current schema changes')
    .option('--dry-run', 'Show SQL without writing file')
    .option('--dialect <dialect>', 'Database dialect', 'postgresql')
    .action(async (name: string | undefined, opts: { dryRun?: boolean; dialect?: string }) => {
      const migrationName = name ?? 'migration'
      try {
        const { runMigrateGenerate } = await import('./migrate-generate')
        const config = await new ConfigLoader().load()
        const migrationConfig = {
          ...DEFAULT_MIGRATION_CONFIG,
          ...config.migrations,
        }
        const { SchemaBridge, SchemaDiff, MigrationGenerator } =
          await import('@magnet-cms/adapter-db-drizzle')
        const bridge = new SchemaBridge()
        const diff = new SchemaDiff(bridge)
        const gen = new MigrationGenerator()

        console.log(ansis.cyan('Analyzing schema changes...'))
        const result = await runMigrateGenerate(
          diff,
          gen,
          migrationName,
          migrationConfig.directory,
          {
            dryRun: opts.dryRun ?? false,
            dialect: (opts.dialect ?? config.dialect ?? 'postgresql') as
              | 'postgresql'
              | 'mysql'
              | 'sqlite',
          },
        )

        if (result.isEmpty) {
          console.log(ansis.green('✓ No schema changes detected'))
        } else if (opts.dryRun) {
          console.log(ansis.cyan('Dry run — SQL preview:'))
          console.log(result.content)
        } else {
          if (result.dangerous) {
            for (const w of result.warnings ?? []) {
              console.warn(ansis.yellow(`⚠ ${w}`))
            }
          }
          console.log(ansis.green(`✓ Created: ${result.filename}`))
        }
        process.exit(0)
      } catch (err) {
        console.error(ansis.red('✗ Generate failed:'), err instanceof Error ? err.message : err)
        process.exit(1)
      }
    })

  migrate
    .command('create [name]')
    .description('Create an empty migration file')
    .action(async (name = 'migration') => {
      try {
        const { runMigrateCreate } = await import('./migrate-create')
        const config = await new ConfigLoader().load()
        const migrationConfig = {
          ...DEFAULT_MIGRATION_CONFIG,
          ...config.migrations,
        }
        const result = await runMigrateCreate(name, migrationConfig.directory)
        console.log(ansis.green(`✓ Created: ${result.filename}`))
        process.exit(0)
      } catch (err) {
        console.error(ansis.red('✗ Create failed:'), err instanceof Error ? err.message : err)
        process.exit(1)
      }
    })

  migrate
    .command('reset')
    .description('Roll back all migrations and re-apply them')
    .option('--force', 'Skip confirmation prompt')
    .action(async (opts: { force?: boolean }) => {
      try {
        const { runMigrateReset } = await import('./migrate-reset')
        if (!opts.force) {
          const { confirm } = await import('@inquirer/prompts')
          const ok = await confirm({
            message: 'Reset will roll back ALL migrations. Continue?',
          })
          if (!ok) {
            console.log('Aborted.')
            process.exit(0)
          }
        }
        const config = await new ConfigLoader().load()
        const db = await createConnection(config.databaseUrl)
        const migrationConfig = {
          ...DEFAULT_MIGRATION_CONFIG,
          ...config.migrations,
        }
        const runner = new MigrationRunner(db, migrationConfig)
        const result = await runMigrateReset(
          runner,
          await loadMigrationsFromDirectory(migrationConfig.directory),
        )
        console.log(
          ansis.green(`✓ Reset: rolled back ${result.rolledBack}, applied ${result.applied}`),
        )
        process.exit(0)
      } catch (err) {
        console.error(ansis.red('✗ Reset failed:'), err instanceof Error ? err.message : err)
        process.exit(1)
      }
    })

  migrate
    .command('fresh')
    .description('Drop all tables and re-apply all migrations')
    .option('--force', 'Skip confirmation prompt')
    .action(async (opts: { force?: boolean }) => {
      try {
        const { runMigrateFresh } = await import('./migrate-fresh')
        if (!opts.force) {
          const { confirm } = await import('@inquirer/prompts')
          const ok = await confirm({
            message: 'Fresh will DROP ALL TABLES. Continue?',
          })
          if (!ok) {
            console.log('Aborted.')
            process.exit(0)
          }
        }
        const config = await new ConfigLoader().load()
        const db = await createConnection(config.databaseUrl)
        const migrationConfig = {
          ...DEFAULT_MIGRATION_CONFIG,
          ...config.migrations,
        }
        const runner = new MigrationRunner(db, migrationConfig)
        const result = await runMigrateFresh(
          db,
          runner,
          [],
          await loadMigrationsFromDirectory(migrationConfig.directory),
        )
        console.log(
          ansis.green(`✓ Fresh: dropped ${result.dropped} tables, applied ${result.applied}`),
        )
        process.exit(0)
      } catch (err) {
        console.error(ansis.red('✗ Fresh failed:'), err instanceof Error ? err.message : err)
        process.exit(1)
      }
    })
}
