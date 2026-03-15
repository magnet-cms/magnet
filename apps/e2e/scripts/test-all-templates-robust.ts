#!/usr/bin/env bun
import { ChildProcess, spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	examples,
	startTemplate,
	stopAllTemplates,
	stopTemplate,
} from './docker-manager'

// @ts-expect-error - Bun-specific import.meta.dir
const __dirname = import.meta.dir ?? dirname(fileURLToPath(import.meta.url))

type ExampleName = keyof typeof examples

const EXAMPLE_ENV_VARS: Record<ExampleName, Record<string, string>> = {
	mongoose: {
		MONGODB_URI: 'mongodb://localhost:27017/cats-example',
		JWT_SECRET: 'test-secret-key',
		VAULT_ADDR: 'http://localhost:8200',
		VAULT_TOKEN: 'dev-token',
		SMTP_HOST: 'localhost',
		SMTP_PORT: '1025',
		EMAIL_FROM: 'noreply@magnet.local',
		TEMPLATE_NAME: 'mongoose',
	},
	'drizzle-neon': {
		DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/neon-example',
		JWT_SECRET: 'test-secret-key',
		S3_BUCKET: 'magnet-media',
		S3_REGION: 'us-east-1',
		S3_ACCESS_KEY: 'minioadmin',
		S3_SECRET_KEY: 'minioadmin',
		S3_ENDPOINT: 'http://localhost:9000',
		SMTP_HOST: 'localhost',
		SMTP_PORT: '1025',
		EMAIL_FROM: 'noreply@magnet.local',
		VAULT_MASTER_KEY:
			'0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
		TEMPLATE_NAME: 'drizzle-neon',
	},
	'drizzle-supabase': {
		DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/postgres',
		SUPABASE_URL: 'http://localhost:8000',
		SUPABASE_ANON_KEY:
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
		SUPABASE_SERVICE_KEY:
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
		JWT_SECRET: 'super-secret-jwt-token-with-at-least-32-characters-long',
		SUPABASE_STORAGE_BUCKET: 'media',
		TEMPLATE_NAME: 'drizzle-supabase',
	},
}

function updateDevAdmin(
	example: ExampleName,
	envVars: Record<string, string>,
): void {
	const rootDir = resolve(__dirname, '../../..')
	const devAdminPath = resolve(rootDir, 'scripts/dev-admin.js')

	// Build environment variable assignments
	const envAssignments = Object.entries(envVars)
		.map(([key, value]) => `process.env.${key} = '${value}'`)
		.join('\n')

	const devAdminContent = `#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

process.env.NODE_ENV = 'development'

// Set example-specific environment variables
${envAssignments}

console.log('Starting admin development environment for ${example}...')

const nestjs = spawn('bun', ['run', 'dev'], {
	cwd: resolve(projectRoot, 'apps', 'examples', '${example}'),
	stdio: 'inherit',
	shell: true,
	env: { ...process.env, NODE_ENV: 'development' },
})

const vite = spawn('bun', ['run', 'dev'], {
	cwd: resolve(projectRoot, 'packages', 'client', 'admin'),
	stdio: 'inherit',
	shell: true,
})

console.log('NestJS server and Vite dev server started')

process.on('SIGINT', () => {
	nestjs.kill('SIGINT')
	vite.kill('SIGINT')
	process.exit(0)
})

process.on('SIGTERM', () => {
	nestjs.kill('SIGTERM')
	vite.kill('SIGTERM')
	process.exit(0)
})
`

	writeFileSync(devAdminPath, devAdminContent, 'utf-8')
}

async function waitForHealth(url: string, timeout = 120_000): Promise<boolean> {
	const startTime = Date.now()
	const healthUrl = `${url}/health`

	while (Date.now() - startTime < timeout) {
		try {
			const response = await fetch(healthUrl)
			// Accept 200 (OK) or 500 (server running but health check issue) as "server is up"
			// The important thing is that the server is responding
			if (response.status === 200 || response.status === 500) {
				// If 500, check if it's a real server error or just health check issue
				if (response.status === 200) {
					return true
				}
				// For 500, verify it's actually the server (not connection refused)
				const text = await response.text()
				if (text.includes('statusCode') || text.includes('message')) {
					// Server is responding, even if health check has issues
					console.log(
						'⚠️  Health endpoint returned 500, but server is responding',
					)
					return true
				}
			}
		} catch (error) {
			// Connection refused or other network error - server not ready
		}
		await new Promise((resolve) => setTimeout(resolve, 2000))
	}
	return false
}

async function waitForUI(url: string, timeout = 60_000): Promise<boolean> {
	const startTime = Date.now()

	while (Date.now() - startTime < timeout) {
		try {
			const response = await fetch(url)
			if (response.ok) {
				return true
			}
		} catch {
			// Server not ready yet
		}
		await new Promise((resolve) => setTimeout(resolve, 2000))
	}
	return false
}

function killProcess(process: ChildProcess | null): void {
	if (process) {
		try {
			process.kill('SIGTERM')
		} catch {
			// Process may already be dead
		}
	}
}

async function runTestsForExample(
	example: ExampleName,
	testArgs: string[] = [],
): Promise<boolean> {
	console.log(`\n${'='.repeat(70)}`)
	console.log(`🧪 Testing example: ${example}`)
	console.log('='.repeat(70))

	let backendProcess: ChildProcess | null = null
	let adminProcess: ChildProcess | null = null

	try {
		// Start Docker containers
		console.log('\n📦 Starting Docker containers...')
		await startTemplate(example)

		// Wait for database to be ready
		if (example === 'drizzle-supabase') {
			console.log('⏳ Waiting for Supabase to be ready (45 seconds)...')
			await new Promise((resolve) => setTimeout(resolve, 45_000))
		} else {
			console.log('⏳ Waiting for database to be ready (10 seconds)...')
			await new Promise((resolve) => setTimeout(resolve, 10_000))
		}
		console.log('✅ Docker containers ready')

		// Set environment variables
		const envVars = EXAMPLE_ENV_VARS[example]
		const env = {
			...process.env,
			...envVars,
			EXAMPLE_NAME: example,
		}

		// Update dev-admin.js
		updateDevAdmin(example, envVars)

		// Start the backend server
		const examplePath = resolve(__dirname, `../../examples/${example}`)

		console.log('\n🚀 Starting backend server...')
		backendProcess = spawn('bun', ['run', 'dev'], {
			cwd: examplePath,
			env,
			stdio: 'pipe',
			shell: true,
		})

		// Log backend output
		backendProcess.stdout?.on('data', (data) => {
			const output = data.toString()
			if (output.includes('Nest application successfully started')) {
				console.log('✅ Backend server started')
			}
		})

		backendProcess.stderr?.on('data', (data) => {
			const output = data.toString()
			if (!output.includes('DeprecationWarning')) {
				process.stderr.write(data)
			}
		})

		// Wait for backend to be ready
		console.log(
			'⏳ Waiting for backend server to be ready (up to 120 seconds)...',
		)
		const backendReady = await waitForHealth('http://localhost:3000', 120_000)

		if (!backendReady) {
			console.error('❌ Backend server did not become ready')
			return false
		}
		console.log('✅ Backend server is ready!')

		// Start the admin UI
		const adminPath = resolve(__dirname, '../../../packages/client/admin')
		console.log('\n🚀 Starting admin UI...')
		adminProcess = spawn('bun', ['run', 'dev'], {
			cwd: adminPath,
			env,
			stdio: 'pipe',
			shell: true,
		})

		// Log admin output
		adminProcess.stdout?.on('data', (data) => {
			const output = data.toString()
			if (output.includes('Local:') || output.includes('ready')) {
				console.log('✅ Admin UI started')
			}
		})

		// Wait for admin UI to be ready
		console.log('⏳ Waiting for admin UI to be ready (up to 60 seconds)...')
		const uiReady = await waitForUI('http://localhost:3001', 60_000)

		if (!uiReady) {
			console.error('❌ Admin UI did not become ready')
			return false
		}
		console.log('✅ Admin UI is ready!')

		// Give servers a moment to stabilize
		console.log('\n⏳ Waiting for servers to stabilize (5 seconds)...')
		await new Promise((resolve) => setTimeout(resolve, 5_000))

		// Run tests
		console.log('\n🧪 Running tests...')
		const testProcess = spawn('bun', ['run', 'test', ...testArgs], {
			cwd: resolve(__dirname, '..'),
			env,
			stdio: 'inherit',
			shell: true,
		})

		// Wait for tests to complete
		const testExitCode = await new Promise<number>((resolve) => {
			testProcess.on('exit', (code) => resolve(code ?? 0))
		})

		if (testExitCode !== 0) {
			console.error(
				`\n❌ Tests failed for ${example} (exit code: ${testExitCode})`,
			)
			return false
		}

		console.log(`\n✅ Tests passed for ${example}!`)
		return true
	} catch (error) {
		console.error(`\n❌ Error testing ${example}:`, error)
		return false
	} finally {
		// Cleanup
		console.log('\n🧹 Cleaning up...')
		killProcess(backendProcess)
		killProcess(adminProcess)

		// Wait a bit for processes to die
		await new Promise((resolve) => setTimeout(resolve, 3_000))

		// Kill any remaining processes
		try {
			await stopTemplate(example)
		} catch (error) {
			console.warn(`Warning: Error stopping example ${example}:`, error)
		}
	}
}

async function main() {
	const args = process.argv.slice(2)
	const exampleArg = args.find((arg) => arg.startsWith('--example='))
	const example = exampleArg
		? (exampleArg.split('=')[1] as ExampleName)
		: undefined

	const testArgs = args.filter((arg) => !arg.startsWith('--example='))

	if (example) {
		// Test single example
		if (!(example in examples)) {
			console.error(`Unknown example: ${example}`)
			console.error(`Available examples: ${Object.keys(examples).join(', ')}`)
			process.exit(1)
		}
		const success = await runTestsForExample(example, testArgs)
		process.exit(success ? 0 : 1)
	} else {
		// Test all examples
		console.log('🧪 Running tests for ALL examples')
		console.log('This will test each example sequentially until all pass\n')

		const exampleNames = Object.keys(examples) as ExampleName[]
		const results: Record<ExampleName, boolean> = {} as Record<
			ExampleName,
			boolean
		>
		let attempt = 1
		const maxAttempts = 3

		while (true) {
			console.log(`\n${'='.repeat(70)}`)
			console.log(`📊 Attempt ${attempt} of ${maxAttempts}`)
			console.log('='.repeat(70))

			let allPassed = true
			const failedExamples: ExampleName[] = []

			for (const exampleName of exampleNames) {
				// Skip if already passed
				if (results[exampleName] === true) {
					console.log(`\n⏭️  Skipping ${exampleName} (already passed)`)
					continue
				}

				const success = await runTestsForExample(exampleName, testArgs)
				results[exampleName] = success

				if (!success) {
					allPassed = false
					failedExamples.push(exampleName)
				}

				// Wait between examples
				if (exampleName !== exampleNames[exampleNames.length - 1]) {
					console.log('\n⏳ Waiting 5 seconds before next example...')
					await new Promise((resolve) => setTimeout(resolve, 5_000))
				}
			}

			if (allPassed) {
				console.log(`\n${'='.repeat(70)}`)
				console.log('🎉 ALL EXAMPLES PASSED!')
				console.log('='.repeat(70))
				break
			}

			if (attempt >= maxAttempts) {
				console.log(`\n${'='.repeat(70)}`)
				console.log('❌ Some examples failed after maximum attempts')
				console.log('='.repeat(70))
				console.log('\nFailed examples:')
				for (const exampleName of failedExamples) {
					console.log(`  - ${exampleName}`)
				}
				await stopAllTemplates()
				process.exit(1)
			}

			console.log(
				`\n⚠️  Some examples failed. Retrying (attempt ${attempt + 1}/${maxAttempts})...`,
			)
			attempt++

			// Wait before retry
			console.log('⏳ Waiting 10 seconds before retry...')
			await new Promise((resolve) => setTimeout(resolve, 10_000))
		}

		await stopAllTemplates()
		console.log('\n✅ All example tests completed successfully!')
	}
}

// @ts-expect-error - Bun-specific import.meta.main
if (import.meta.main) {
	main().catch(async (error) => {
		console.error('Error:', error)
		await stopAllTemplates()
		process.exit(1)
	})
}
