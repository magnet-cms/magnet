import { expect, test } from '../../src/fixtures/base.fixture'
import { testData } from '../../src/helpers/test-data'

test.describe('API Keys API', () => {
	test.describe('Authentication Required', () => {
		test('GET /api/api-keys returns 401 when not authenticated', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.get(`${apiBaseURL}/api/api-keys`)
			expect(response.status()).toBe(401)
		})

		test('POST /api/api-keys returns 401 when not authenticated', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.post(`${apiBaseURL}/api/api-keys`, {
				data: { name: 'Test Key' },
			})
			expect(response.status()).toBe(401)
		})
	})

	test.describe('API Key Management', () => {
		test.beforeEach(async ({ apiClient }) => {
			const status = await apiClient.getAuthStatus()

			if (status.requiresSetup) {
				const userData = testData.user.create()
				const auth = await apiClient.register(userData)
				apiClient.setToken(auth.access_token)
			} else {
				// Login with existing admin user or register
				const userData = testData.user.create()
				try {
					const auth = await apiClient.register(userData)
					apiClient.setToken(auth.access_token)
				} catch {
					// If registration fails, user might already exist or registration disabled
					test.skip()
				}
			}
		})

		test('POST /api/api-keys creates a new API key', async ({ apiClient }) => {
			const keyData = {
				name: 'Test Integration Key',
				description: 'A key for testing',
				permissions: ['content.read', 'content.write'],
				rateLimit: 500,
			}

			const response = await apiClient.createApiKey(keyData)

			expect(response.id).toBeDefined()
			expect(response.name).toBe(keyData.name)
			expect(response.description).toBe(keyData.description)
			expect(response.permissions).toEqual(keyData.permissions)
			expect(response.rateLimit).toBe(keyData.rateLimit)
			expect(response.keyPrefix).toMatch(/^mgnt_/)
			expect(response.plainKey).toMatch(/^mgnt_/)
			expect(response.enabled).toBe(true)
			expect(response.usageCount).toBe(0)
		})

		test('POST /api/api-keys creates key with default permissions', async ({
			apiClient,
		}) => {
			const response = await apiClient.createApiKey({
				name: 'Default Permission Key',
			})

			expect(response.permissions).toEqual(['*'])
		})

		test('GET /api/api-keys returns list of user API keys', async ({
			apiClient,
		}) => {
			// Create a key first
			await apiClient.createApiKey({ name: 'List Test Key' })

			const response = await apiClient.getApiKeys()
			expect(response.ok()).toBeTruthy()

			const keys = await response.json()
			expect(Array.isArray(keys)).toBe(true)
			expect(keys.length).toBeGreaterThan(0)

			// Keys should not include the plainKey or keyHash
			const key = keys[0]
			expect(key).toHaveProperty('id')
			expect(key).toHaveProperty('name')
			expect(key).toHaveProperty('keyPrefix')
			expect(key).not.toHaveProperty('plainKey')
			expect(key).not.toHaveProperty('keyHash')
		})

		test('GET /api/api-keys/:id returns specific key', async ({
			apiClient,
		}) => {
			const created = await apiClient.createApiKey({ name: 'Get Test Key' })

			const response = await apiClient.getApiKey(created.id)
			expect(response.ok()).toBeTruthy()

			const key = await response.json()
			expect(key.id).toBe(created.id)
			expect(key.name).toBe('Get Test Key')
		})

		test('PUT /api/api-keys/:id updates key', async ({ apiClient }) => {
			const created = await apiClient.createApiKey({
				name: 'Update Test Key',
				rateLimit: 1000,
			})

			const response = await apiClient.updateApiKey(created.id, {
				name: 'Updated Key Name',
				description: 'New description',
				rateLimit: 2000,
			})
			expect(response.ok()).toBeTruthy()

			const updated = await response.json()
			expect(updated.name).toBe('Updated Key Name')
			expect(updated.description).toBe('New description')
			expect(updated.rateLimit).toBe(2000)
		})

		test('DELETE /api/api-keys/:id deletes key', async ({ apiClient }) => {
			const created = await apiClient.createApiKey({ name: 'Delete Test Key' })

			const deleteResponse = await apiClient.deleteApiKey(created.id)
			expect(deleteResponse.ok()).toBeTruthy()

			// Key should no longer exist
			const getResponse = await apiClient.getApiKey(created.id)
			expect(getResponse.status()).toBe(404)
		})

		test('POST /api/api-keys/:id/revoke revokes key', async ({ apiClient }) => {
			const created = await apiClient.createApiKey({ name: 'Revoke Test Key' })

			const revokeResponse = await apiClient.revokeApiKey(
				created.id,
				'Testing revocation',
			)
			expect(revokeResponse.ok()).toBeTruthy()

			// Key should be disabled
			const getResponse = await apiClient.getApiKey(created.id)
			const key = await getResponse.json()
			expect(key.enabled).toBe(false)
		})

		test('POST /api/api-keys/:id/rotate creates new key with same settings', async ({
			apiClient,
		}) => {
			const originalData = {
				name: 'Rotate Test Key',
				permissions: ['content.read'],
				rateLimit: 500,
			}
			const original = await apiClient.createApiKey(originalData)

			const rotated = await apiClient.rotateApiKey(original.id)

			// New key should have similar settings
			expect(rotated.id).not.toBe(original.id)
			expect(rotated.plainKey).not.toBe(original.plainKey)
			expect(rotated.keyPrefix).not.toBe(original.keyPrefix)
			expect(rotated.permissions).toEqual(originalData.permissions)
			expect(rotated.rateLimit).toBe(originalData.rateLimit)
			expect(rotated.name).toContain('rotated')

			// Original key should be disabled
			const originalResponse = await apiClient.getApiKey(original.id)
			const originalKey = await originalResponse.json()
			expect(originalKey.enabled).toBe(false)
		})

		test('GET /api/api-keys/:id/usage returns usage statistics', async ({
			apiClient,
		}) => {
			const created = await apiClient.createApiKey({ name: 'Usage Stats Key' })

			const stats = await apiClient.getApiKeyUsageStats(created.id, 7)

			expect(stats).toHaveProperty('totalRequests')
			expect(stats).toHaveProperty('successCount')
			expect(stats).toHaveProperty('errorCount')
			expect(stats).toHaveProperty('successRate')
			expect(stats).toHaveProperty('avgResponseTime')
			expect(typeof stats.totalRequests).toBe('number')
		})

		test('GET /api/api-keys/:id/usage/history returns usage history', async ({
			apiClient,
		}) => {
			const created = await apiClient.createApiKey({
				name: 'Usage History Key',
			})

			const response = await apiClient.getApiKeyUsageHistory(created.id, 10)
			expect(response.ok()).toBeTruthy()

			const history = await response.json()
			expect(Array.isArray(history)).toBe(true)
		})
	})

	test.describe('API Key Authorization', () => {
		test('Cannot access other user API keys', async ({
			apiClient,
			request,
			apiBaseURL,
		}) => {
			const status = await apiClient.getAuthStatus()
			test.skip(
				status.requiresSetup !== true,
				'Need fresh setup to test authorization',
			)

			// Create first user and their key
			const user1Data = testData.user.create()
			const auth1 = await apiClient.register(user1Data)
			apiClient.setToken(auth1.access_token)

			const key1 = await apiClient.createApiKey({ name: 'User 1 Key' })

			// Create second user
			const user2Data = testData.user.create()
			const auth2Response = await request.post(`${apiBaseURL}/auth/register`, {
				data: user2Data,
			})
			const auth2 = await auth2Response.json()
			apiClient.setToken(auth2.access_token)

			// Try to access first user's key
			const getResponse = await apiClient.getApiKey(key1.id)
			expect(getResponse.status()).toBe(404)
		})
	})
})
