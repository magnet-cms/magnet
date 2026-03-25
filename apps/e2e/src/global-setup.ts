import type { FullConfig } from '@playwright/test'
import { waitForServers } from './helpers/wait-for-server'

const CI = !!process.env.CI
if (!CI && process.env.MAGNET_E2E_DISABLE_AUTH_THROTTLE === undefined) {
	process.env.MAGNET_E2E_DISABLE_AUTH_THROTTLE = '1'
}

async function globalSetup(_config: FullConfig) {
	console.log('Checking if servers are ready...')

	try {
		await waitForServers()
		console.log('All servers are ready!')
	} catch (error) {
		console.error('\n❌ Servers not responding!')
		console.error('Please start the servers before running tests:')
		console.error('  Terminal 1: bun run dev:admin')
		console.error('  Terminal 2: cd apps/e2e && bun run test\n')
		throw error
	}
}

export default globalSetup
