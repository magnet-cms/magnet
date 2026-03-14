import { expect, test } from '../../src/fixtures/auth.fixture'

test.describe('Activity API', () => {
	test.describe('GET /activity', () => {
		test('returns recent activities array', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.getRecentActivity()
			expect(response.ok()).toBeTruthy()
			const body = await response.json()
			expect(Array.isArray(body)).toBe(true)
		})

		test('accepts limit parameter', async ({ authenticatedApiClient }) => {
			const response = await authenticatedApiClient.getRecentActivity(5)
			expect(response.ok()).toBeTruthy()
			const body = await response.json()
			expect(Array.isArray(body)).toBe(true)
			expect(body.length).toBeLessThanOrEqual(5)
		})

		test('requires authentication', async ({ request, apiBaseURL }) => {
			const response = await request.get(`${apiBaseURL}/activity`)
			expect(response.status()).toBe(401)
		})
	})

	test.describe('GET /activity/entity/:type/:id', () => {
		test('returns activities for entity', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.getActivityByEntity(
				'content',
				'some-doc-id',
			)
			expect(response.ok()).toBeTruthy()
			const body = await response.json()
			expect(Array.isArray(body)).toBe(true)
		})

		test('requires authentication', async ({ request, apiBaseURL }) => {
			const response = await request.get(
				`${apiBaseURL}/activity/entity/content/some-id`,
			)
			expect(response.status()).toBe(401)
		})
	})

	test.describe('GET /activity/search', () => {
		test('returns paginated result on first call (regression: model not initialized)', async ({
			authenticatedApiClient,
		}) => {
			// Regression test: query() must work even when no prior async method
			// has been called on the model (e.g. on first page load with no activity logged).
			const response = await authenticatedApiClient.searchActivity({
				limit: 500,
				offset: 0,
			})
			expect(response.ok()).toBeTruthy()
			const body = await response.json()
			expect(body).toHaveProperty('items')
			expect(body).toHaveProperty('total')
			expect(Array.isArray(body.items)).toBe(true)
		})

		test('returns paginated result with items and total', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.searchActivity({
				entityType: 'content',
				limit: 10,
				offset: 0,
			})
			expect(response.ok()).toBeTruthy()
			const body = await response.json()
			expect(body).toHaveProperty('items')
			expect(body).toHaveProperty('total')
			expect(Array.isArray(body.items)).toBe(true)
		})

		test('filters by action type', async ({ authenticatedApiClient }) => {
			const response = await authenticatedApiClient.searchActivity({
				action: 'content.created',
			})
			expect(response.ok()).toBeTruthy()
			const body = await response.json()
			expect(Array.isArray(body.items)).toBe(true)
			for (const item of body.items) {
				expect(item.action).toBe('content.created')
			}
		})
	})
})
