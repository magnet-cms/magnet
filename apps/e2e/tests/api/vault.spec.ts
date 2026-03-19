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

		// Template-specific adapter assertion
		// Note: In CI, HashiCorp Vault may fall back to 'db' adapter if connection fails
		if (TEMPLATE_NAME === 'mongoose') {
			expect(['hashicorp', 'db']).toContain(body.adapter)
		} else if (TEMPLATE_NAME === 'drizzle-supabase') {
			expect(['supabase', 'db']).toContain(body.adapter)
		} else {
			expect(body.adapter).toBeDefined()
		}
	})

	test('Vault CRUD — create, read, update, delete secret', async ({
		authenticatedApiClient,
	}) => {
		// Check adapter type first — CRUD shape differs between adapters
		const statusResp = await authenticatedApiClient.getVaultStatus()
		const status = await statusResp.json()
		test.skip(
			status.adapter === 'db',
			'DB vault adapter uses different response shape',
		)

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

		// List secrets — our key should appear (list all, prefix filter not supported)
		const listResponse = await authenticatedApiClient.listVaultSecrets()
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

	test('GET /vault/status is publicly accessible', async ({ apiClient }) => {
		// apiClient has no auth token set — endpoint is public
		const response = await apiClient.getVaultStatus()
		expect(response.ok()).toBeTruthy()
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(body.healthy).toBeDefined()
	})
})
