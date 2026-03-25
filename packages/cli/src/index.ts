import ansis from 'ansis'
import { Command } from 'commander'

import type { DrizzleAdapterModule } from './commands/migrate'

const program = new Command()

program.name('magnet').description('Magnet CMS CLI').version('0.1.0')

// Dev command — works for all adapters
program
  .command('dev')
  .description('Start Docker services and NestJS application in watch mode')
  .action(async () => {
    const { runDev } = await import('./commands/dev')
    await runDev()
  })

// Docker commands — works for all adapters
const docker = program.command('docker').description('Docker Compose service management')

docker
  .command('up')
  .description('Start Docker Compose services')
  .action(async () => {
    const { runDockerUp } = await import('./commands/docker')
    await runDockerUp()
  })

docker
  .command('down')
  .description('Stop Docker Compose services')
  .option('-v, --volumes', 'Remove named volumes')
  .action(async (opts: { volumes?: boolean }) => {
    const { runDockerDown } = await import('./commands/docker')
    await runDockerDown(opts)
  })

docker
  .command('logs')
  .description('Stream Docker Compose service logs')
  .action(async () => {
    const { runDockerLogs } = await import('./commands/docker')
    await runDockerLogs()
  })

// Database reset command — works for all adapters
program
  .command('db:reset')
  .description('Reset database: tear down volumes, recreate containers')
  .option('--force', 'Skip confirmation prompt')
  .action(async (opts: { force?: boolean }) => {
    const { runDbReset } = await import('./commands/db-reset')
    await runDbReset(opts)
  })

async function init(): Promise<void> {
  // Register migration commands only if drizzle adapter is available
  try {
    const drizzle = (await import('@magnet-cms/adapter-db-drizzle')) as DrizzleAdapterModule
    const { registerMigrateCommands } = await import('./commands/migrate')
    registerMigrateCommands(program, drizzle)
  } catch {
    // Drizzle adapter not installed — migration commands not available
  }

  await program.parseAsync(process.argv)
}

init().catch((err) => {
  console.error(ansis.red('Error:'), err instanceof Error ? err.message : err)
  process.exit(1)
})
