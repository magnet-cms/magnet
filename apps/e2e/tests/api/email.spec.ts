import { expect, test } from '../../src/fixtures/auth.fixture'
import { MailPitClient } from '../../src/helpers/mailpit-client'

const TEMPLATE_NAME = process.env.TEMPLATE_NAME || ''
const HAS_MAILPIT =
	TEMPLATE_NAME === 'mongoose' || TEMPLATE_NAME === 'drizzle-neon'

// ============================================================================
// Existing Email API Tests (run for all templates)
// ============================================================================

test.describe('Email System API', () => {
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

// ============================================================================
// MailPit Email Delivery Verification (only for templates with MailPit)
// ============================================================================

test.describe('Email Delivery via MailPit', () => {
	test.skip(!HAS_MAILPIT, 'MailPit not available for this template')

	const mailpit = new MailPitClient()

	test.beforeAll(async ({ authenticatedApiClient }) => {
		// Enable email channel in notification settings
		await authenticatedApiClient.updateSettings('notifications', {
			emailChannelEnabled: true,
		})
	})

	test.beforeEach(async () => {
		// Clear inbox between tests
		await mailpit.deleteAllMessages()
	})

	test.afterAll(async ({ authenticatedApiClient }) => {
		// Restore default: disable email channel
		await authenticatedApiClient.updateSettings('notifications', {
			emailChannelEnabled: false,
		})
	})

	test('notification with email channel delivers to MailPit', async ({
		request,
		apiBaseURL,
		testUser,
	}) => {
		// Send notification via the notifications API with JWT auth
		const response = await request.post(`${apiBaseURL}/notifications`, {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${testUser.token}`,
			},
			data: {
				userId: testUser.email,
				channels: ['email'],
				type: 'test.e2e',
				title: 'E2E Test Notification',
				message: 'This is an automated E2E test email',
			},
		})

		// The notification endpoint should accept the request
		// (even if email delivery fails, the API should return 200)
		expect([200, 201]).toContain(response.status())

		// Wait for email to arrive in MailPit — fail if not delivered
		const message = await mailpit.waitForMessage(
			'subject:E2E Test Notification',
			10_000,
		)
		expect(message.Subject).toContain('E2E Test Notification')
	})

	test('password reset sends email to MailPit', async ({
		request,
		apiBaseURL,
		testUser,
	}) => {
		const response = await request.post(`${apiBaseURL}/auth/forgot-password`, {
			data: { email: testUser.email },
		})
		expect(response.ok()).toBe(true)

		// Wait for password reset email — fail if not delivered
		const message = await mailpit.waitForMessage(`to:${testUser.email}`, 10_000)
		expect(message.To[0].Address).toBe(testUser.email)
		expect(message.Subject.toLowerCase()).toContain('password')
	})
})
