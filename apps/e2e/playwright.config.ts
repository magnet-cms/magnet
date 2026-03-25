import { defineConfig, devices } from '@playwright/test'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:3001'
const CI = !!process.env.CI

/** Matches `bun run dev:admin` (Nest gets MAGNET_E2E_DISABLE_AUTH_THROTTLE). CI leaves this unset so rate-limit tests assert real 429s. */
if (!CI && process.env.MAGNET_E2E_DISABLE_AUTH_THROTTLE === undefined) {
	process.env.MAGNET_E2E_DISABLE_AUTH_THROTTLE = '1'
}

export default defineConfig({
	testDir: './tests',

	fullyParallel: true,
	forbidOnly: CI,
	retries: CI ? 2 : 1,
	workers: CI ? 1 : 4,

	reporter: CI
		? [
				['github'],
				['html', { open: 'never' }],
				['json', { outputFile: 'test-results/results.json' }],
			]
		: [['list'], ['html', { open: 'on-failure' }]],

	timeout: 30_000,
	expect: {
		timeout: 5_000,
	},

	use: {
		baseURL: API_BASE_URL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: CI ? 'on-first-retry' : 'off',
	},

	globalSetup: './src/global-setup.ts',

	projects: [
		{
			name: 'api',
			testDir: './tests/api',
			use: {
				baseURL: API_BASE_URL,
			},
		},
		{
			name: 'ui',
			testDir: './tests/ui',
			use: {
				...devices['Desktop Chrome'],
				baseURL: UI_BASE_URL,
			},
		},
		{
			name: 'admin-serve',
			testDir: './tests/admin-serve',
			use: {
				...devices['Desktop Chrome'],
				baseURL: API_BASE_URL,
			},
		},
	],

	// Servers must be started manually before running tests:
	// Terminal 1: bun run dev:admin (starts both backend + frontend)
	// Terminal 2: cd apps/e2e && bun run test
})
