import ansis from 'ansis'
import { program } from 'commander'

import { generateProject } from './generators/index.js'
import { collectConfig } from './prompts.js'
import type { DatabaseAdapter } from './types.js'
import { showBanner, showErrorMessage, showSuccessMessage, withSpinner } from './ui/index.js'
import { installDependencies } from './utils/package-manager.js'

interface CliOptions {
  database?: DatabaseAdapter
  install?: boolean
  example?: boolean
}

async function main(): Promise<void> {
  program
    .name('create-magnet')
    .description('Create a new Magnet CMS project')
    .version('0.1.0')
    .argument('[project-name]', 'Name of the project')
    .option(
      '-d, --database <adapter>',
      'Database adapter (mongoose, drizzle-neon, drizzle-supabase)',
    )
    .option('--no-install', 'Skip dependency installation')
    .option('--no-example', 'Skip example module')
    .action(async (projectNameArg: string | undefined, options: CliOptions) => {
      try {
        showBanner()

        // Collect configuration via prompts
        const config = await collectConfig(projectNameArg, options)

        // Generate project files
        await withSpinner(
          'Creating project structure...',
          async () => generateProject(config),
          'Project structure created',
        )

        // Install dependencies
        if (options.install !== false) {
          try {
            await withSpinner(
              'Installing dependencies...',
              async () => installDependencies(config),
              'Dependencies installed',
            )
          } catch {
            console.log()
            console.log(ansis.yellow('Warning:'), 'Failed to install dependencies.')
            console.log(ansis.dim('You can install them manually by running:'))
            console.log(ansis.dim(`  cd ${config.projectName}`))
            console.log(ansis.dim(`  ${config.packageManager} install`))
          }
        }

        // Show success message
        showSuccessMessage(config)
      } catch (error) {
        // Handle user cancellation (Ctrl+C)
        if (error instanceof Error && error.message.includes('User force closed')) {
          console.log()
          console.log(ansis.dim('Operation cancelled.'))
          process.exit(0)
        }
        showErrorMessage(error)
        process.exit(1)
      }
    })

  await program.parseAsync()
}

main().catch((error) => {
  showErrorMessage(error)
  process.exit(1)
})
