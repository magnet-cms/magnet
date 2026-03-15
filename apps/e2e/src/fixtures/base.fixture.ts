import { test as base } from '@playwright/test'
import { ApiClient } from '../helpers/api-client'
import { CleanupManager } from './cleanup.fixture'

export const test = base.extend<{
	apiClient: ApiClient
	apiBaseURL: string
	uiBaseURL: string
	cleanup: CleanupManager
}>({
	apiBaseURL: async (_deps, use) => {
		await use(process.env.API_BASE_URL || 'http://localhost:3000')
	},

	uiBaseURL: async (_deps, use) => {
		await use(process.env.UI_BASE_URL || 'http://localhost:3001')
	},

	cleanup: async (_deps, use) => {
		const manager = new CleanupManager()
		await use(manager)
		await manager.cleanup()
	},

	apiClient: async ({ request, apiBaseURL }, use) => {
		const client = new ApiClient(request, apiBaseURL)
		await use(client)
	},
})

export { expect } from '@playwright/test'
