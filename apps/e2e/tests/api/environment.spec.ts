import { expect, test } from '../../src/fixtures/auth.fixture'

test.describe('Environment API', () => {
	test('GET /environments returns all environments', async ({
		authenticatedApiClient,
	}) => {
		const response = await authenticatedApiClient.getEnvironments()
		expect(response.ok()).toBeTruthy()

		const envs = await response.json()
		expect(Array.isArray(envs)).toBe(true)
		expect(envs.length).toBeGreaterThan(0)
	})

	test('GET /environments includes local environment', async ({
		authenticatedApiClient,
	}) => {
		const response = await authenticatedApiClient.getEnvironments()
		const envs = await response.json()

		const local = envs.find((e: { id: string }) => e.id === 'local')
		expect(local).toBeDefined()
		expect(local.name).toBe('Local')
		expect(local.isLocal).toBe(true)
		expect(local).toHaveProperty('connectionString')
	})

	test('GET /environments/local returns local environment', async ({
		authenticatedApiClient,
	}) => {
		const response = await authenticatedApiClient.getLocalEnvironment()
		expect(response.ok()).toBeTruthy()

		const env = await response.json()
		expect(env.id).toBe('local')
		expect(env.isLocal).toBe(true)
		expect(env.isDefault).toBe(true)
		expect(env).toHaveProperty('connectionString')
	})

	test.describe('Authentication required', () => {
		test('GET /environments requires authentication', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.get(`${apiBaseURL}/environments`)
			expect(response.status()).toBe(401)
		})

		test('GET /environments/local requires authentication', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.get(`${apiBaseURL}/environments/local`)
			expect(response.status()).toBe(401)
		})
	})
})
