import { expect, test } from '../../src/fixtures/auth.fixture'

test.describe('Vault Plugin API', () => {
	// ============================================================================
	// Connection Status
	// ============================================================================
	test.describe('Status', () => {
		test('GET /vault/status returns 200 and not-configured status', async ({
			request,
			apiBaseURL,
			testUser,
		}) => {
			const response = await request.get(`${apiBaseURL}/vault/status`, {
				headers: { Authorization: `Bearer ${testUser.token}` },
			})

			expect(response.status()).toBe(200)
			const body = await response.json()
			expect(body).toHaveProperty('configured')
			expect(body).toHaveProperty('connected')
			expect(body).toHaveProperty('mountPath')
			// In E2E environment, Vault is not configured
			expect(body.configured).toBe(false)
			expect(body.connected).toBe(false)
		})

		test('GET /vault/status requires authentication', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.get(`${apiBaseURL}/vault/status`)

			expect(response.status()).toBe(401)
		})
	})

	// ============================================================================
	// Test Connection
	// ============================================================================
	test.describe('Test Connection', () => {
		test('POST /vault/test-connection returns not-configured when Vault is not set up', async ({
			request,
			apiBaseURL,
			testUser,
		}) => {
			const response = await request.post(
				`${apiBaseURL}/vault/test-connection`,
				{
					headers: { Authorization: `Bearer ${testUser.token}` },
				},
			)

			expect(response.ok()).toBe(true)
			const body = await response.json()
			expect(body.success).toBe(false)
			expect(body.error).toBeTruthy()
		})
	})

	// ============================================================================
	// Secret Listing
	// ============================================================================
	test.describe('Secrets', () => {
		test('GET /vault/secrets returns empty paths when not configured', async ({
			request,
			apiBaseURL,
			testUser,
		}) => {
			const response = await request.get(`${apiBaseURL}/vault/secrets`, {
				headers: { Authorization: `Bearer ${testUser.token}` },
			})

			expect(response.status()).toBe(200)
			const body = await response.json()
			expect(body).toHaveProperty('paths')
			expect(body.paths).toEqual([])
		})

		test('GET /vault/secrets requires authentication', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.get(`${apiBaseURL}/vault/secrets`)

			expect(response.status()).toBe(401)
		})
	})

	// ============================================================================
	// Mappings CRUD
	// ============================================================================
	test.describe('Mappings', () => {
		test('GET /vault/mappings returns mappings array', async ({
			request,
			apiBaseURL,
			testUser,
		}) => {
			const response = await request.get(`${apiBaseURL}/vault/mappings`, {
				headers: { Authorization: `Bearer ${testUser.token}` },
			})

			expect(response.status()).toBe(200)
			const body = await response.json()
			expect(body).toHaveProperty('mappings')
			expect(Array.isArray(body.mappings)).toBe(true)
		})

		test('PUT /vault/mappings creates and returns mappings', async ({
			request,
			apiBaseURL,
			testUser,
		}) => {
			const mappings = [
				{ path: 'secret/data/myapp/db', mapTo: 'database', watch: false },
				{ path: 'secret/data/myapp/jwt', mapTo: 'jwt', watch: true },
			]

			const putResponse = await request.put(`${apiBaseURL}/vault/mappings`, {
				headers: {
					Authorization: `Bearer ${testUser.token}`,
					'Content-Type': 'application/json',
				},
				data: { mappings },
			})

			expect(putResponse.status()).toBe(200)
			const putBody = await putResponse.json()
			expect(putBody.mappings).toHaveLength(2)
			expect(putBody.mappings[0].path).toBe('secret/data/myapp/db')
			expect(putBody.mappings[0].mapTo).toBe('database')
			expect(putBody.mappings[1].watch).toBe(true)

			// Verify persistence via GET
			const getResponse = await request.get(`${apiBaseURL}/vault/mappings`, {
				headers: { Authorization: `Bearer ${testUser.token}` },
			})
			const getBody = await getResponse.json()
			expect(getBody.mappings).toHaveLength(2)
		})

		test('PUT /vault/mappings filters out invalid entries', async ({
			request,
			apiBaseURL,
			testUser,
		}) => {
			const mappings = [
				{ path: 'secret/data/valid', mapTo: 'valid' },
				{ path: '', mapTo: 'missing-path' },
				{ path: 'secret/data/no-target', mapTo: '' },
			]

			const response = await request.put(`${apiBaseURL}/vault/mappings`, {
				headers: {
					Authorization: `Bearer ${testUser.token}`,
					'Content-Type': 'application/json',
				},
				data: { mappings },
			})

			expect(response.status()).toBe(200)
			const body = await response.json()
			// Only the valid entry should remain
			expect(body.mappings).toHaveLength(1)
			expect(body.mappings[0].path).toBe('secret/data/valid')
		})
	})
})
