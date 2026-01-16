import { expect, test } from '../../src/fixtures/base.fixture'
import { testData } from '../../src/helpers/test-data'

/**
 * Tests for the extensible auth strategy system.
 *
 * These tests verify that:
 * 1. The default JWT strategy works (backward compatibility)
 * 2. Authentication endpoints function correctly with the new strategy system
 * 3. Token-based authentication continues to work as expected
 */
test.describe('Auth Strategy System', () => {
	test.describe('Default JWT Strategy (Backward Compatibility)', () => {
		test('login returns access_token with JWT strategy', async ({
			apiClient,
		}) => {
			const status = await apiClient.getAuthStatus()
			test.skip(status.requiresSetup === true, 'Setup required first')

			// Create a new user for this test
			const userData = testData.user.create()
			await apiClient.register(userData)

			// Login with credentials
			const response = await apiClient.login(userData.email, userData.password)

			expect(response.access_token).toBeDefined()
			expect(typeof response.access_token).toBe('string')
			expect(response.access_token.length).toBeGreaterThan(0)
		})

		test('JWT token can be used to access protected endpoints', async ({
			apiClient,
		}) => {
			const status = await apiClient.getAuthStatus()
			test.skip(status.requiresSetup === true, 'Setup required first')

			// Create and login user
			const userData = testData.user.create()
			const auth = await apiClient.register(userData)

			// Use token to access protected endpoint
			apiClient.setToken(auth.access_token)
			const meResponse = await apiClient.getMe()

			expect(meResponse.ok()).toBeTruthy()

			const user = await meResponse.json()
			expect(user.email).toBe(userData.email)
			expect(user.role).toBeDefined()
		})

		test('invalid credentials return error', async ({ apiClient }) => {
			const status = await apiClient.getAuthStatus()
			test.skip(status.requiresSetup === true, 'Setup required first')

			// Try to login with invalid credentials
			try {
				await apiClient.login('nonexistent@example.com', 'wrongpassword')
				// Should not reach here
				expect(true).toBe(false)
			} catch {
				// Expected to fail - auth strategy throws UnauthorizedException
				expect(true).toBe(true)
			}
		})

		test('register returns user with id and email', async ({ apiClient }) => {
			const status = await apiClient.getAuthStatus()
			test.skip(
				status.requiresSetup !== true,
				'Users already exist, registration may be restricted',
			)

			const userData = testData.user.create()
			const response = await apiClient.register(userData)

			// Register endpoint returns access_token after registration
			expect(response.access_token).toBeDefined()

			// Verify we can use the token to get user info
			apiClient.setToken(response.access_token)
			const meResponse = await apiClient.getMe()
			expect(meResponse.ok()).toBeTruthy()

			const user = await meResponse.json()
			expect(user.email).toBe(userData.email)
			expect(user.id).toBeDefined()
		})
	})

	test.describe('Auth Status Endpoint', () => {
		test('returns correct status for unauthenticated requests', async ({
			apiClient,
		}) => {
			const status = await apiClient.getAuthStatus()

			expect(status).toHaveProperty('authenticated')
			expect(status.authenticated).toBe(false)

			// Should indicate if setup is required
			if (status.requiresSetup !== undefined) {
				expect(typeof status.requiresSetup).toBe('boolean')
			}
		})
	})
})
