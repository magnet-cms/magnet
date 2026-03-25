import { randomUUID } from 'node:crypto'
import { test as base } from '@playwright/test'
import { ApiClient, E2E_AUTH_THROTTLE_HEADER } from '../helpers/api-client'
import { CleanupManager } from './cleanup.fixture'

export const test = base.extend<{
	e2eThrottleId: string
	apiClient: ApiClient
	apiBaseURL: string
	uiBaseURL: string
	cleanup: CleanupManager
}>({
	/** One UUID per test; shared by ApiClient + browser so auth rate limits stay per-test under parallel runs. */
	// biome-ignore lint/correctness/noEmptyPattern: Playwright fixture with no dependencies requires object destructuring
	e2eThrottleId: async ({}, use) => {
		await use(randomUUID())
	},

	page: async ({ page, e2eThrottleId }, use) => {
		await page.setExtraHTTPHeaders({
			[E2E_AUTH_THROTTLE_HEADER]: e2eThrottleId,
		})
		await use(page)
	},

	// biome-ignore lint/correctness/noEmptyPattern: Playwright fixture with no dependencies requires object destructuring
	apiBaseURL: async ({}, use) => {
		await use(process.env.API_BASE_URL || 'http://localhost:3000')
	},

	// biome-ignore lint/correctness/noEmptyPattern: Playwright fixture with no dependencies requires object destructuring
	uiBaseURL: async ({}, use) => {
		await use(process.env.UI_BASE_URL || 'http://localhost:3001')
	},

	// biome-ignore lint/correctness/noEmptyPattern: Playwright fixture with no dependencies requires object destructuring
	cleanup: async ({}, use) => {
		const manager = new CleanupManager()
		await use(manager)
		await manager.cleanup()
	},

	apiClient: async ({ request, apiBaseURL, e2eThrottleId }, use) => {
		const client = new ApiClient(request, apiBaseURL, e2eThrottleId)
		await use(client)
	},
})

export { expect } from '@playwright/test'
