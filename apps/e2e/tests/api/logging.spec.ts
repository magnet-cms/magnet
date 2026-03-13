import { expect, test } from '../../src/fixtures/base.fixture'

test.describe('Logging Infrastructure', () => {
	test('GET /health succeeds with LoggingInterceptor active', async ({
		apiClient,
	}) => {
		const response = await apiClient.getHealth()

		expect(response.ok()).toBeTruthy()
		expect(response.status()).toBe(200)
	})

	test('custom x-request-id header is echoed back in response', async ({
		request,
		apiBaseURL,
	}) => {
		const customRequestId = 'test-request-id-12345'
		const response = await request.get(`${apiBaseURL}/health`, {
			headers: {
				'x-request-id': customRequestId,
			},
		})

		expect(response.ok()).toBeTruthy()
		expect(response.status()).toBe(200)
		expect(response.headers()['x-request-id']).toBe(customRequestId)
	})

	test('x-request-id header is present in response even without custom header', async ({
		request,
		apiBaseURL,
	}) => {
		const response = await request.get(`${apiBaseURL}/health`)

		expect(response.ok()).toBeTruthy()
		expect(response.headers()['x-request-id']).toBeTruthy()
	})

	test('multiple concurrent requests succeed with logging active', async ({
		apiClient,
	}) => {
		const responses = await Promise.all([
			apiClient.getHealth(),
			apiClient.getHealth(),
			apiClient.getHealth(),
		])

		for (const response of responses) {
			expect(response.ok()).toBeTruthy()
			expect(response.status()).toBe(200)
		}
	})

	test('GET /health responds within 500ms with logging overhead', async ({
		apiClient,
	}) => {
		const start = Date.now()
		const response = await apiClient.getHealth()
		const elapsed = Date.now() - start

		expect(response.ok()).toBeTruthy()
		expect(elapsed).toBeLessThan(500)
	})
})
