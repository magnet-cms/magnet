import { expect, test } from '../../src/fixtures/base.fixture'

/**
 * Polar Plugin API E2E Tests
 *
 * These tests verify the Polar plugin endpoints are reachable.
 * They gracefully skip if the plugin is not registered in the test app.
 *
 * Prerequisites:
 * - Register PolarPlugin in the test app's AppModule
 * - Set POLAR_ACCESS_TOKEN and POLAR_WEBHOOK_SECRET env vars
 * - Enable rawBody: true in NestFactory.create()
 */
test.describe('Polar Plugin API', () => {
	test('GET /polar/products — returns product list or 404 if plugin not registered', async ({
		request,
		apiBaseURL,
	}) => {
		const response = await request.get(`${apiBaseURL}/polar/products`)

		if (response.status() === 404) {
			test.skip(true, 'Polar plugin not registered in test app')
			return
		}

		expect(response.ok()).toBeTruthy()
		const products = await response.json()
		expect(Array.isArray(products)).toBeTruthy()
	})

	test('GET /polar/access/:userId — returns no subscription for unknown user', async ({
		request,
		apiBaseURL,
	}) => {
		const response = await request.get(
			`${apiBaseURL}/polar/access/nonexistent-user-id`,
		)

		if (response.status() === 404) {
			test.skip(true, 'Polar plugin not registered in test app')
			return
		}

		expect(response.ok()).toBeTruthy()
		const access = await response.json()
		expect(access.hasActiveSubscription).toBe(false)
		expect(access.plan).toBeNull()
		expect(access.features).toEqual([])
	})

	test('POST /polar/webhooks — rejects requests without valid signature', async ({
		request,
		apiBaseURL,
	}) => {
		const response = await request.post(`${apiBaseURL}/polar/webhooks`, {
			data: JSON.stringify({ type: 'test.event' }),
			headers: { 'Content-Type': 'application/json' },
		})

		if (response.status() === 404) {
			test.skip(true, 'Polar plugin not registered in test app')
			return
		}

		// Should fail due to missing/invalid webhook signature
		expect(response.ok()).toBeFalsy()
	})

	test('POST /polar/checkout — rejects without required fields', async ({
		request,
		apiBaseURL,
	}) => {
		const response = await request.post(`${apiBaseURL}/polar/checkout`, {
			data: JSON.stringify({}),
			headers: { 'Content-Type': 'application/json' },
		})

		if (response.status() === 404) {
			test.skip(true, 'Polar plugin not registered in test app')
			return
		}

		// Should fail due to missing products array
		expect(response.ok()).toBeFalsy()
	})
})
