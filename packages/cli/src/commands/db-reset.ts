import ansis from 'ansis'
import { findComposeFile, runCompose, waitForHealthy } from '../utils/docker'

/**
 * Reset the database: tear down volumes, recreate containers, wait for healthy.
 */
export async function runDbReset(options: { force?: boolean }): Promise<void> {
	const composeFile = findComposeFile(process.cwd())
	if (!composeFile) {
		console.error(
			ansis.red('✗'),
			'No docker/docker-compose.yml found in current directory.',
		)
		process.exit(1)
	}

	if (!options.force) {
		const { confirm } = await import('@inquirer/prompts')
		const ok = await confirm({
			message:
				'This will destroy all database data and recreate containers. Continue?',
		})
		if (!ok) {
			console.log('Aborted.')
			process.exit(0)
		}
	}

	console.log(ansis.cyan('Tearing down containers and volumes...'))
	await runCompose(composeFile, ['down', '--volumes'])

	console.log(ansis.cyan('Recreating containers...'))
	await runCompose(composeFile, ['up', '-d'])

	console.log(ansis.cyan('Waiting for database to be ready...'))
	try {
		await waitForHealthy(composeFile)
		console.log(ansis.green('✓ Database reset complete — fresh and healthy'))
	} catch {
		console.log(
			ansis.yellow(
				'⚠ Health check timed out — containers may still be starting',
			),
		)
	}

	process.exit(0)
}
