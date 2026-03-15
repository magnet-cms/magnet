import { expect, test } from '../../src/fixtures/auth.fixture'

const TEMPLATE_NAME = process.env.TEMPLATE_NAME || ''

test.describe('Vault API', () => {
	test('GET /vault/status returns healthy status', async ({
		authenticatedApiClient,
	}) => {
		const response = await authenticatedApiClient.getVaultStatus()

		expect(response.ok()).toBeTruthy()

		const body = await response.json()
		expect(body.healthy).toBe(true)

		// Template-aware adapter type assertion
		if (TEMPLATE_NAME === 'mongoose') {
			expect(body.adapter).toBe('hashicorp')
		} else if (TEMPLATE_NAME === 'drizzle-neon') {
			expect(body.adapter).toBe('db')
		} else if (TEMPLATE_NAME === 'drizzle-supabase') {
			expect(body.adapter).toBe('db')
		}
	})

	test('Vault CRUD — create, read, update, delete secret', async ({
		authenticatedApiClient,
	}) => {
		const secretKey = `e2e-test-${Date.now()}`
		const secretData = { username: 'admin', password: 'test-pass-123' }
		const updatedData = {
			username: 'admin',
			password: 'updated-pass-456',
			extra: 'field',
		}

		// Create secret
		const createResponse = await authenticatedApiClient.setVaultSecret(
			secretKey,
			secretData,
		)
		expect(createResponse.ok()).toBeTruthy()
		const createBody = await createResponse.json()
		expect(createBody.success).toBe(true)

		// Read secret
		const readResponse = await authenticatedApiClient.getVaultSecret(secretKey)
		expect(readResponse.ok()).toBeTruthy()
		const readBody = await readResponse.json()
		expect(readBody.key).toBe(secretKey)
		expect(readBody.data.username).toBe('admin')
		expect(readBody.data.password).toBe('test-pass-123')

		// Update secret
		const updateResponse = await authenticatedApiClient.setVaultSecret(
			secretKey,
			updatedData,
		)
		expect(updateResponse.ok()).toBeTruthy()

		// Verify update
		const verifyResponse =
			await authenticatedApiClient.getVaultSecret(secretKey)
		const verifyBody = await verifyResponse.json()
		expect(verifyBody.data.password).toBe('updated-pass-456')
		expect(verifyBody.data.extra).toBe('field')

		// List secrets — our key should appear
		const listResponse =
			await authenticatedApiClient.listVaultSecrets('e2e-test-')
		expect(listResponse.ok()).toBeTruthy()
		const listBody = await listResponse.json()
		expect(listBody.keys).toContain(secretKey)

		// Delete secret
		const deleteResponse =
			await authenticatedApiClient.deleteVaultSecret(secretKey)
		expect(deleteResponse.ok()).toBeTruthy()

		// Verify deletion — should return empty data
		const deletedResponse =
			await authenticatedApiClient.getVaultSecret(secretKey)
		expect(deletedResponse.ok()).toBeTruthy()
		const deletedBody = await deletedResponse.json()
		expect(deletedBody.data).toEqual({})
	})

	test('GET /vault/status requires authentication', async ({ apiClient }) => {
		// apiClient has no auth token set
		const response = await apiClient.getVaultStatus()
		expect(response.ok()).toBeFalsy()
		expect(response.status()).toBe(401)
	})
})
