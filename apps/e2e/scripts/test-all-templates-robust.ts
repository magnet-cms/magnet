#!/usr/bin/env bun
import { ChildProcess, spawn } from 'node:child_process'
import { readdirSync, rmSync } from 'node:fs'
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	examples,
	startTemplate,
	stopAllTemplates,
	stopTemplate,
} from './docker-manager'

/** Check if Docker is available (e.g. Docker Desktop with WSL integration enabled). */
async function isDockerAvailable(): Promise<boolean> {
	return new Promise((resolvePromise) => {
		const proc = spawn('docker', ['version'], {
			stdio: 'ignore',
			shell: true,
		})
		proc.on('close', (code) => resolvePromise(code === 0))
		proc.on('error', () => resolvePromise(false))
		setTimeout(() => {
			proc.kill('SIGTERM')
			resolvePromise(false)
		}, 5000)
	})
}

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
		// Playground plugin writes modules here during e2e so example src/modules stays clean
		MAGNET_PLAYGROUND_MODULES_PATH: '/tmp/magnet-e2e-playground-modules',
	},
	'drizzle-neon': {
		DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/neon-example',
		JWT_SECRET: 'test-secret-key',
		S3_BUCKET: 'magnet-media',
		S3_REGION: 'us-east-1',
		S3_ACCESS_KEY_ID: 'minioadmin',
		S3_SECRET_ACCESS_KEY: 'minioadmin',
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
		// 127.0.0.1 avoids IPv6 localhost quirks (e.g. some WSL/Docker setups)
		SUPABASE_URL: 'http://127.0.0.1:8000',
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

/** Wait until an HTTP endpoint responds (2xx or non-5xx). */
async function waitForHttpEndpoint(
	url: string,
	label: string,
	timeoutMs: number,
): Promise<boolean> {
	const start = Date.now()
	while (Date.now() - start < timeoutMs) {
		try {
			const response = await fetch(url)
			// Kong returns 502/503 while upstream (e.g. storage) is still starting
			if (response.status === 502 || response.status === 503) {
				await new Promise((r) => setTimeout(r, 2000))
				continue
			}
			if (response.ok || response.status < 500) {
				console.log(`  ✓ ${label}`)
				return true
			}
		} catch {
			// not ready
		}
		await new Promise((r) => setTimeout(r, 2000))
	}
	console.error(`  ✗ ${label} not ready within ${timeoutMs / 1000}s`)
	return false
}

/** Max time to wait for the test process to exit before forcing exit. */
// Full api+ui suite (300+ tests, workers:1 in CI) can exceed 15m on slower hosts.
const TEST_RUN_TIMEOUT_MS = 25 * 60 * 1000 // 25 minutes

function killProcess(proc: ChildProcess | null): void {
	if (!proc?.pid) return
	try {
		proc.kill('SIGTERM')
	} catch {
		// Process may already be dead
	}
}

function killProcessForcibly(proc: ChildProcess | null): void {
	if (!proc?.pid) return
	try {
		proc.kill('SIGKILL')
	} catch {
		// Ignore
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
	let testProcess: ChildProcess | null = null

	try {
		// Start Docker containers
		console.log('\n📦 Starting Docker containers...')
		await startTemplate(example)

		// Wait for database to be ready
		if (example === 'drizzle-supabase') {
			console.log('⏳ Waiting for Supabase Kong + Storage (up to 2 minutes)...')
			const supabaseOk =
				(await waitForHttpEndpoint(
					'http://127.0.0.1:8000/rest/v1/',
					'Supabase REST (Kong)',
					120_000,
				)) &&
				(await waitForHttpEndpoint(
					'http://127.0.0.1:8000/storage/v1/',
					'Supabase Storage (Kong)',
					120_000,
				))
			if (!supabaseOk) {
				console.error('❌ Supabase stack did not become ready')
				return false
			}
			await new Promise((resolve) => setTimeout(resolve, 5000))
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

		// Remove leftover playground test* modules so backend compiles (e.g. mongoose)
		const examplePath = resolve(__dirname, `../../examples/${example}`)
		const modulesDir = resolve(examplePath, 'src', 'modules')
		try {
			const entries = readdirSync(modulesDir, { withFileTypes: true })
			for (const e of entries) {
				if (e.isDirectory() && e.name.startsWith('test')) {
					rmSync(resolve(modulesDir, e.name), { recursive: true })
				}
			}
		} catch {
			// modules dir may not exist
		}

		// Kill any process using 3000/3001 to avoid hitting a stale server from a previous run
		try {
			await new Promise<void>((resolve) => {
				const proc = spawn(
					'sh',
					[
						'-c',
						'for p in 3000 3001; do lsof -ti:$p 2>/dev/null | xargs kill -9 2>/dev/null; done; true',
					],
					{
						stdio: 'ignore',
					},
				)
				proc.on('close', () => resolve())
				proc.on('error', () => resolve())
				setTimeout(() => {
					proc.kill('SIGTERM')
					resolve()
				}, 3000)
			})
			await new Promise((r) => setTimeout(r, 2000))
		} catch {
			// Ignore
		}

		// Start the backend server

		console.log('\n🚀 Starting backend server...')
		const backendLog: string[] = []
		const pushLog = (label: string, data: Buffer | string) => {
			const line = data.toString().trim()
			if (line) backendLog.push(`[${label}] ${line}`)
		}
		backendProcess = spawn('bun', ['run', 'dev'], {
			cwd: examplePath,
			env,
			stdio: 'pipe',
			shell: true,
		})

		// Log backend output and keep last 200 lines for failure diagnosis
		backendProcess.stdout?.on('data', (data) => {
			const output = data.toString()
			pushLog('stdout', data)
			if (output.includes('Nest application successfully started')) {
				console.log('✅ Backend server started')
			}
		})

		backendProcess.stderr?.on('data', (data) => {
			const output = data.toString()
			pushLog('stderr', data)
			if (!output.includes('DeprecationWarning')) {
				process.stderr.write(data)
			}
		})

		// Wait for backend to be ready
		console.log(
			'⏳ Waiting for backend server to be ready (up to 180 seconds)...',
		)
		const backendReady = await waitForHealth('http://localhost:3000', 180_000)

		if (!backendReady) {
			console.error('❌ Backend server did not become ready')
			const lastLines = backendLog.slice(-80)
			if (lastLines.length > 0) {
				console.error('\n--- Last backend output ---')
				lastLines.forEach((line) => console.error(line))
				console.error('--- End backend output ---\n')
			}
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

		// Give servers a moment to stabilize before Playwright's global setup runs
		console.log('\n⏳ Waiting for servers to stabilize (10 seconds)...')
		await new Promise((resolve) => setTimeout(resolve, 10_000))

		// Run tests
		console.log('\n🧪 Running tests...')
		testProcess = spawn('bun', ['run', 'test', ...testArgs], {
			cwd: resolve(__dirname, '..'),
			env,
			stdio: 'inherit',
			shell: true,
		})

		// Wait for tests to complete, with a hard timeout so we never hang
		const testExitCode = await new Promise<number>((resolve) => {
			const timeoutId = setTimeout(() => {
				console.error(
					`\n❌ Test run timed out after ${TEST_RUN_TIMEOUT_MS / 60_000} minutes — killing test process`,
				)
				killProcessForcibly(testProcess)
				resolve(1)
			}, TEST_RUN_TIMEOUT_MS)
			testProcess?.on('exit', (code) => {
				clearTimeout(timeoutId)
				resolve(code ?? 0)
			})
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
		// Cleanup: kill test process first so it doesn't outlive backend/admin
		console.log('\n🧹 Cleaning up...')
		killProcess(testProcess)
		killProcess(backendProcess)
		killProcess(adminProcess)

		// Wait for processes to die, then force-kill if needed
		await new Promise((resolve) => setTimeout(resolve, 2_000))
		killProcessForcibly(testProcess)
		killProcessForcibly(backendProcess)
		killProcessForcibly(adminProcess)
		await new Promise((resolve) => setTimeout(resolve, 1_000))

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
	const serversAlreadyRunning = args.includes('--servers-already-running')
	// Exit on first failure by default so the script doesn't run on; use --no-fail-fast to run all examples and retry
	const failFast = !args.includes('--no-fail-fast')
	const example = exampleArg
		? (exampleArg.split('=')[1] as ExampleName)
		: undefined

	const testArgs = args.filter(
		(arg) =>
			!arg.startsWith('--example=') &&
			arg !== '--servers-already-running' &&
			arg !== '--no-fail-fast',
	)

	// If servers are already running, just run Playwright once (no Docker, no process spawn).
	if (serversAlreadyRunning) {
		console.log(
			'🧪 Running e2e tests (servers assumed already running on 3000/3001)...\n',
		)
		const testProcess = spawn('bun', ['run', 'test', ...testArgs], {
			cwd: resolve(__dirname, '..'),
			stdio: 'inherit',
			shell: true,
			env: process.env,
		})
		const code = await new Promise<number>((resolve) => {
			testProcess.on('exit', (c) => resolve(c ?? 0))
		})
		process.exit(code)
	}

	// Otherwise we need Docker to start DBs and then we start backend/admin.
	const dockerOk = await isDockerAvailable()
	if (!dockerOk) {
		console.error('❌ Docker is not available.')
		console.error(
			'   test:all needs Docker to start databases for each example. Install Docker and ensure',
		)
		console.error(
			'   the Docker CLI is in PATH (e.g. enable "WSL integration" in Docker Desktop settings).',
		)
		console.error('   See: https://docs.docker.com/desktop/wsl/')
		console.error('')
		console.error(
			'   To run tests against already-running servers instead, use:',
		)
		console.error('   bun run test:all -- --servers-already-running')
		process.exit(1)
	}

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
					if (failFast) {
						console.error(
							'\n❌ Exiting after first failure (use --no-fail-fast to run all examples and retry).',
						)
						await stopAllTemplates()
						process.exit(1)
					}
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

if (import.meta.main) {
	main().catch(async (error) => {
		console.error('Error:', error)
		await stopAllTemplates()
		process.exit(1)
	})
}
