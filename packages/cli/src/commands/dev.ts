import { spawn } from 'node:child_process'
import ansis from 'ansis'
import {
	findComposeFile,
	isDockerAvailable,
	runCompose,
	waitForHealthy,
} from '../utils/docker'

/**
 * Run the development environment:
 * 1. Start Docker services (if available)
 * 2. Wait for DB health check
 * 3. Start NestJS in watch mode
 */
export async function runDev(): Promise<void> {
	const cwd = process.cwd()
	const composeFile = findComposeFile(cwd)
	const dockerAvailable = await isDockerAvailable()

	// Start Docker services if possible
	if (!dockerAvailable) {
		console.log(
			ansis.yellow('Docker not found.'),
			'Install Docker to use local database containers.',
		)
		console.log(ansis.dim('  https://docs.docker.com/get-docker/'))
		console.log(ansis.dim('  Starting app without Docker...\n'))
	} else if (!composeFile) {
		console.log(
			ansis.yellow('No docker/docker-compose.yml found.'),
			'Starting app without Docker...\n',
		)
	} else {
		console.log(ansis.cyan('Starting Docker services...'))
		await runCompose(composeFile, ['up', '-d'])

		console.log(ansis.cyan('Waiting for database to be ready...'))
		try {
			await waitForHealthy(composeFile)
			console.log(ansis.green('✓ Database is healthy\n'))
		} catch {
			console.log(
				ansis.yellow('⚠ Health check timed out — starting app anyway\n'),
			)
		}
	}

	// Start NestJS in watch mode
	console.log(ansis.cyan('Starting NestJS application...\n'))
	const nest = spawn('npx', ['nest', 'start', '--watch'], {
		stdio: 'inherit',
		cwd,
	})

	// Forward SIGINT to nest process
	process.on('SIGINT', () => {
		console.log(ansis.dim('\nStopping application...'))
		nest.kill('SIGINT')
	})

	nest.on('close', (code) => {
		process.exit(code ?? 0)
	})

	nest.on('error', (err) => {
		console.error(ansis.red('Failed to start NestJS:'), err.message)
		process.exit(1)
	})
}
