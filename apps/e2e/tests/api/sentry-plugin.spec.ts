import { expect, test } from '../../src/fixtures/base.fixture'
import { testData } from '../../src/helpers/test-data'

/**
 * Sentry Plugin E2E Tests
 *
 * These tests verify the Sentry plugin's API endpoints integrate correctly
 * with a running Magnet CMS application. A real Sentry DSN is not required —
 * the SDK initializes with any syntactically valid DSN without transmitting.
 */
test.describe('Sentry Plugin', () => {
	test.describe('GET /sentry/config — authentication required', () => {
		test('returns 401 when not authenticated', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.get(`${apiBaseURL}/api/sentry/config`)
			expect(response.status()).toBe(401)
		})
	})

	test.describe('GET /sentry/config — authenticated', () => {
		test.beforeEach(async ({ apiClient }) => {
			const status = await apiClient.getAuthStatus()

			if (status.requiresSetup) {
				const userData = testData.user.create()
				const auth = await apiClient.register(userData)
				apiClient.setToken(auth.access_token)
			} else {
				const userData = testData.user.create()
				try {
					const auth = await apiClient.register(userData)
					apiClient.setToken(auth.access_token)
				} catch {
					test.skip()
				}
			}
		})

		test('returns { dsn, enabled, environment } shape', async ({
			apiClient,
		}) => {
			const response = await apiClient.getSentryConfig()
			expect(response.status()).toBe(200)

			const config = (await response.json()) as {
				dsn: string
				enabled: boolean
				environment: string
			}
			expect(typeof config.dsn).toBe('string')
			expect(typeof config.enabled).toBe('boolean')
			expect(typeof config.environment).toBe('string')
		})

		test('enabled defaults to true', async ({ apiClient }) => {
			const response = await apiClient.getSentryConfig()
			const config = (await response.json()) as { enabled: boolean }
			expect(config.enabled).toBe(true)
		})
	})
})
