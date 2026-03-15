import { execFile, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const COMPOSE_FILE_PATH = 'docker/docker-compose.yml'

/** DB service names used in generated Docker Compose files */
const DB_SERVICE_NAMES = ['mongodb', 'postgres']

interface ContainerStatus {
	Service: string
	Health: string
	State: string
}

/**
 * Check if Docker is available on the system.
 */
export async function isDockerAvailable(): Promise<boolean> {
	return new Promise((resolve) => {
		execFile('docker', ['--version'], (error) => {
			resolve(!error)
		})
	})
}

/**
 * Find the Docker Compose file relative to a directory.
 * Returns the absolute path if found, null otherwise.
 */
export function findComposeFile(cwd: string): string | null {
	const composePath = join(cwd, COMPOSE_FILE_PATH)
	return existsSync(composePath) ? composePath : null
}

/**
 * Run `docker compose` with the given arguments, streaming output to the terminal.
 * Returns a promise that resolves when the process exits.
 */
export function runCompose(
	composeFile: string,
	args: string[],
): Promise<number> {
	return new Promise((resolve, reject) => {
		const child = spawn('docker', ['compose', '-f', composeFile, ...args], {
			stdio: 'inherit',
		})

		child.on('close', (code) => {
			resolve(code ?? 0)
		})

		child.on('error', (err) => {
			reject(err)
		})
	})
}

/**
 * Wait for the primary database service to become healthy.
 * Only checks DB services (mongodb/postgres), not admin UIs.
 */
export async function waitForHealthy(
	composeFile: string,
	timeout = 30000,
): Promise<void> {
	const start = Date.now()

	while (Date.now() - start < timeout) {
		try {
			const healthy = await checkDbServiceHealth(composeFile)
			if (healthy) return
		} catch {
			// Service not ready yet
		}
		await new Promise((resolve) => setTimeout(resolve, 1000))
	}

	throw new Error(
		`Database service did not become healthy within ${timeout / 1000}s`,
	)
}

/**
 * Parse Docker Compose ps JSON output — handles both one-per-line and array formats.
 */
function parseComposeJson(stdout: string): ContainerStatus[] {
	const trimmed = stdout.trim()
	if (!trimmed) return []

	// Try parsing as a JSON array first (newer Docker Compose versions)
	try {
		const parsed = JSON.parse(trimmed) as ContainerStatus | ContainerStatus[]
		if (Array.isArray(parsed)) return parsed
		return [parsed]
	} catch {
		// Fall back to one JSON object per line
	}

	const results: ContainerStatus[] = []
	for (const line of trimmed.split('\n').filter(Boolean)) {
		try {
			results.push(JSON.parse(line) as ContainerStatus)
		} catch {
			// Skip unparseable lines
		}
	}
	return results
}

/**
 * Check if the primary DB service is healthy.
 * Uses execFile (not exec) to avoid shell injection with paths containing spaces.
 */
function checkDbServiceHealth(composeFile: string): Promise<boolean> {
	return new Promise((resolve, reject) => {
		execFile(
			'docker',
			['compose', '-f', composeFile, 'ps', '--format', 'json'],
			(error, stdout) => {
				if (error) {
					reject(error)
					return
				}

				const containers = parseComposeJson(stdout)
				for (const container of containers) {
					if (DB_SERVICE_NAMES.includes(container.Service)) {
						resolve(
							container.Health === 'healthy' && container.State === 'running',
						)
						return
					}
				}

				// No DB service found yet
				resolve(false)
			},
		)
	})
}
