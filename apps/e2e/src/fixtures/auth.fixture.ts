import type { AuthResponse } from '../helpers/api-client'
import { ApiClient } from '../helpers/api-client'
import { testData } from '../helpers/test-data'
import { test as base } from './base.fixture'

interface AuthenticatedFixtures {
	authenticatedApiClient: ApiClient
	testUser: { email: string; password: string; token: string }
}

export const test = base.extend<AuthenticatedFixtures>({
	testUser: async ({ apiClient, request, apiBaseURL }, use) => {
		const userData = testData.user.create()
		const status = await apiClient.getAuthStatus()

		let authResponse: AuthResponse
		if (status.requiresSetup) {
			authResponse = await apiClient.register(userData)
			// First user is admin — complete onboarding so PrivateRoute
			// doesn't redirect to /setup and block dashboard access.
			const setupClient = new ApiClient(request, apiBaseURL)
			setupClient.setToken(authResponse.access_token)
			await setupClient.updateSettings('general', {
				siteName: 'Magnet E2E',
			})
		} else {
			// Try registering; if it fails (e.g. 409 Conflict), fall back to login
			try {
				authResponse = await apiClient.register(userData)
			} catch {
				authResponse = await apiClient.login(userData.email, userData.password)
			}
		}

		await use({
			email: userData.email,
			password: userData.password,
			token: authResponse.access_token,
		})
	},

	authenticatedApiClient: async ({ request, apiBaseURL, testUser }, use) => {
		const client = new ApiClient(request, apiBaseURL)
		client.setToken(testUser.token)
		await use(client)
	},
})

export { expect } from '@playwright/test'
