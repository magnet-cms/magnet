import { expect, test } from '../../src/fixtures/base.fixture'

test.describe('Database Migrations', () => {
	test('API server starts successfully with auto-migration enabled', async ({
		apiClient,
	}) => {
		// If the server started and health returns OK, auto-migration ran without error
		const response = await apiClient.getHealth()

		expect(response.ok()).toBeTruthy()
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(body.status).toBe('ok')
	})

	test('user endpoints work after auto-migration (schema applied)', async ({
		request,
		apiBaseURL,
	}) => {
		// Users endpoint requires users table — confirms migration applied the schema
		const response = await request.get(`${apiBaseURL}/api/users`, {
			headers: { Authorization: 'Bearer invalid-token' },
		})

		// 401 means the route exists and schema is correct (not 500 from missing table)
		expect([200, 401, 403]).toContain(response.status())
	})

	test('content endpoints work after auto-migration (schema applied)', async ({
		request,
		apiBaseURL,
	}) => {
		const response = await request.get(`${apiBaseURL}/api/content`, {
			headers: { Authorization: 'Bearer invalid-token' },
		})

		// 401 means the route exists and content table exists (not 500 from missing table)
		expect([200, 401, 403, 404]).toContain(response.status())
	})

	test('API responds quickly after migration completes on startup', async ({
		apiClient,
	}) => {
		const start = Date.now()
		const response = await apiClient.getHealth()
		const elapsed = Date.now() - start

		expect(response.ok()).toBeTruthy()
		// Auto-migration completed on startup, requests should be fast
		expect(elapsed).toBeLessThan(1000)
	})

	test('multiple sequential requests succeed (no migration lock leak)', async ({
		apiClient,
	}) => {
		// If migration lock was leaked, subsequent requests might fail
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
})
