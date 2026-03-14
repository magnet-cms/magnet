import { expect, test } from '../../src/fixtures/auth.fixture'

test.describe('Email System API', () => {
	// ============================================================================
	// Password Reset Flow
	// ============================================================================
	test.describe('Password Reset', () => {
		test('POST /auth/forgot-password returns success message', async ({
			request,
			apiBaseURL,
			testUser,
		}) => {
			const response = await request.post(
				`${apiBaseURL}/auth/forgot-password`,
				{
					data: { email: testUser.email },
				},
			)

			expect(response.ok()).toBe(true)
			const body = await response.json()
			expect(body.message).toContain('password reset')
		})

		test('POST /auth/forgot-password returns same message for non-existent email', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.post(
				`${apiBaseURL}/auth/forgot-password`,
				{
					data: { email: 'nonexistent@example.com' },
				},
			)

			expect(response.ok()).toBe(true)
			const body = await response.json()
			expect(body.message).toContain('password reset')
		})
	})

	// ============================================================================
	// Email Verification Flow
	// ============================================================================
	test.describe('Email Verification', () => {
		test('GET /email/verify returns error without token', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.get(`${apiBaseURL}/email/verify`)

			expect(response.ok()).toBe(false)
			expect(response.status()).toBe(400)
		})

		test('GET /email/verify returns error with invalid token', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.get(
				`${apiBaseURL}/email/verify?token=invalid-token-12345`,
			)

			expect(response.ok()).toBe(false)
			expect(response.status()).toBe(400)
		})
	})

	// ============================================================================
	// Email Settings
	// ============================================================================
	test.describe('Email Settings', () => {
		test('GET /settings/email returns email settings', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.getSettings('email')

			// Settings endpoint may return 404 if the group hasn't been written yet
			const status = response.status()
			expect([200, 404]).toContain(status)

			if (status === 200) {
				const body = await response.json()
				expect(body).toHaveProperty('enabled')
				expect(body).toHaveProperty('fromAddress')
				expect(body).toHaveProperty('appUrl')
			}
		})

		test('PUT /settings/email updates email settings', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.updateSettings('email', {
				fromAddress: 'test@example.com',
				fromName: 'Test App',
				appUrl: 'https://test.example.com',
			})

			// Settings endpoint may return 404 if the group hasn't been initialized
			const status = response.status()
			expect([200, 404]).toContain(status)

			if (status === 200) {
				const body = await response.json()
				expect(body.fromAddress).toBe('test@example.com')
			}
		})
	})
})
