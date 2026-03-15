#!/usr/bin/env bun
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
// @ts-expect-error - Bun-specific import
import { $ } from 'bun'

// @ts-expect-error - Bun-specific import.meta.dir
const __dirname = import.meta.dir ?? dirname(fileURLToPath(import.meta.url))

interface ServiceHealthCheck {
	/** Container name to check */
	container: string
	/** Shell command to run inside the container, or 'http' for HTTP check */
	type: 'exec' | 'http'
	/** For exec: command args. For http: URL to check. */
	check: string
}

interface ExampleConfig {
	composeFile: string
	port: number
	service: string
	/** Additional services to health-check after the primary service */
	additionalChecks?: ServiceHealthCheck[]
	/** Max seconds to wait for all services */
	maxAttempts?: number
}

const examples: Record<string, ExampleConfig> = {
	mongoose: {
		composeFile: resolve(
			__dirname,
			'../../examples/mongoose/docker/docker-compose.yml',
		),
		port: 27017,
		service: 'mongodb',
		additionalChecks: [
			{
				container: 'mongoose-vault',
				type: 'exec',
				check: 'vault status',
			},
			{
				container: 'mongoose-mailpit',
				type: 'http',
				check: 'http://localhost:8025/api/v1/messages',
			},
		],
		maxAttempts: 30,
	},
	'drizzle-neon': {
		composeFile: resolve(
			__dirname,
			'../../examples/drizzle-neon/docker/docker-compose.yml',
		),
		port: 5433,
		service: 'postgres',
		additionalChecks: [
			{
				container: 'drizzle-neon-minio',
				type: 'http',
				check: 'http://localhost:9000/minio/health/live',
			},
			{
				container: 'drizzle-neon-mailpit',
				type: 'http',
				check: 'http://localhost:8025/api/v1/messages',
			},
		],
		maxAttempts: 45,
	},
	'drizzle-supabase': {
		composeFile: resolve(
			__dirname,
			'../../examples/drizzle-supabase/docker/docker-compose.yml',
		),
		port: 5432,
		service: 'drizzle-supabase-db',
		maxAttempts: 90,
	},
}

type ExampleName = keyof typeof examples

async function checkDocker(): Promise<boolean> {
	try {
		await $`docker --version`.quiet()
		return true
	} catch {
		console.error('Docker is not installed or not in PATH')
		return false
	}
}

async function checkDockerCompose(): Promise<boolean> {
	try {
		await $`docker compose version`.quiet()
		return true
	} catch {
		console.error('Docker Compose is not installed or not in PATH')
		return false
	}
}

async function waitForService(
	check: ServiceHealthCheck,
	maxAttempts: number,
): Promise<void> {
	let attempts = 0
	while (attempts < maxAttempts) {
		try {
			if (check.type === 'exec') {
				await $`docker exec ${check.container} ${check.check}`.quiet()
			} else {
				const response = await fetch(check.check)
				if (response.ok || response.status < 500) {
					console.log(`  ✓ ${check.container} is ready`)
					return
				}
			}
			console.log(`  ✓ ${check.container} is ready`)
			return
		} catch {
			attempts++
			await new Promise((resolve) => setTimeout(resolve, 1000))
		}
	}
	throw new Error(
		`${check.container} did not become ready within ${maxAttempts} seconds`,
	)
}

async function startTemplate(template: ExampleName): Promise<void> {
	const config = examples[template]

	if (!config) {
		throw new Error(`Unknown example: ${template}`)
	}

	if (!existsSync(config.composeFile)) {
		throw new Error(`Docker compose file not found: ${config.composeFile}`)
	}

	console.log(`Starting Docker containers for ${template}...`)
	await $`docker compose -f ${config.composeFile} up -d`.quiet()

	const maxAttempts = config.maxAttempts ?? 30

	// Wait for primary database service
	console.log(`Waiting for ${config.service} to be ready...`)
	let attempts = 0

	while (attempts < maxAttempts) {
		try {
			if (config.service === 'mongodb') {
				const containerName = `${template}-${config.service}`
				await $`docker exec ${containerName} mongosh --eval "db.adminCommand('ping')"`.quiet()
				console.log(`  ✓ ${template} MongoDB is ready!`)
				break
			}
			if (
				config.service === 'postgres' ||
				config.service.includes('postgres') ||
				config.service.includes('db')
			) {
				let containerName = config.service
				if (template === 'drizzle-supabase') {
					containerName = 'drizzle-supabase-db'
				} else if (template === 'drizzle-neon') {
					containerName = `${template}-postgres`
				} else {
					containerName = `${template}-${config.service}`
				}
				await $`docker exec ${containerName} pg_isready -U postgres`.quiet()
				console.log(`  ✓ ${template} PostgreSQL is ready!`)
				break
			}
		} catch {
			attempts++
			await new Promise((resolve) => setTimeout(resolve, 1000))
		}
	}

	if (attempts >= maxAttempts) {
		throw new Error(
			`${template} ${config.service} did not become ready within ${maxAttempts} seconds`,
		)
	}

	// Wait for additional services
	if (config.additionalChecks) {
		for (const check of config.additionalChecks) {
			console.log(`Waiting for ${check.container}...`)
			await waitForService(check, maxAttempts)
		}
	}

	console.log(`All Docker services for ${template} are ready!`)
}

async function stopTemplate(template: ExampleName): Promise<void> {
	const config = examples[template]

	if (!config || !existsSync(config.composeFile)) {
		return
	}

	console.log(`Stopping Docker containers for ${template}...`)
	await $`docker compose -f ${config.composeFile} down`.quiet()
}

async function stopAllTemplates(): Promise<void> {
	console.log('Stopping all example Docker containers...')
	for (const template of Object.keys(examples)) {
		await stopTemplate(template).catch(() => {
			// Ignore errors if containers aren't running
		})
	}
}

async function main() {
	const command = process.argv[2]
	const template = process.argv[3] as ExampleName | undefined

	if (!(await checkDocker()) || !(await checkDockerCompose())) {
		process.exit(1)
	}

	switch (command) {
		case 'start':
			if (!template || !(template in examples)) {
				console.error('Usage: bun docker-manager.ts start <example>')
				console.error(`Available examples: ${Object.keys(examples).join(', ')}`)
				process.exit(1)
			}
			await startTemplate(template)
			break

		case 'stop':
			if (!template || !(template in examples)) {
				console.error('Usage: bun docker-manager.ts stop <example>')
				console.error(`Available examples: ${Object.keys(examples).join(', ')}`)
				process.exit(1)
			}
			await stopTemplate(template)
			break

		case 'stop-all':
			await stopAllTemplates()
			break

		default:
			console.error(
				'Usage: bun docker-manager.ts <start|stop|stop-all> [example]',
			)
			process.exit(1)
	}
}

// @ts-expect-error - Bun-specific import.meta.main
if (import.meta.main) {
	main().catch((error) => {
		console.error('Error:', error.message)
		process.exit(1)
	})
}

export { startTemplate, stopTemplate, stopAllTemplates, examples }
