import { expect, test } from '../../src/fixtures/base.fixture'

test.describe('Auth Settings Awareness', () => {
	test('GET /auth/status returns authStrategy field', async ({ apiClient }) => {
		const status = await apiClient.getAuthStatus()

		expect(status).toHaveProperty('authStrategy')
		expect(typeof status.authStrategy).toBe('string')
		// Default mongoose example uses JWT
		expect(status.authStrategy).toBe('jwt')
	})

	test('GET /auth/status does not return externalAuthInfo for JWT strategy', async ({
		apiClient,
	}) => {
		const status = await apiClient.getAuthStatus()

		// Built-in JWT strategy should not have externalAuthInfo
		expect(status.authStrategy).toBe('jwt')
		expect(status.externalAuthInfo).toBeUndefined()
	})

	test('GET /auth/status still returns providers field', async ({
		apiClient,
	}) => {
		const status = await apiClient.getAuthStatus()

		// The existing providers field (for login-page OAuth buttons) should still be present
		expect(status).toHaveProperty('providers')
		expect(Array.isArray(status.providers)).toBe(true)
	})
})
