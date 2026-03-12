import { expect, test } from '../../src/fixtures/auth.fixture'

test.describe('Discovery API', () => {
	test.describe('Schema discovery', () => {
		test('GET /discovery/schemas responds within 2000ms', async ({
			authenticatedApiClient,
		}) => {
			const start = Date.now()
			const response = await authenticatedApiClient.getSchemas()
			const elapsed = Date.now() - start

			expect(response.ok()).toBeTruthy()
			expect(elapsed).toBeLessThan(2000)
		})

		test('GET /discovery/schemas returns list of schemas', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.getSchemas()
			expect(response.ok()).toBeTruthy()

			const schemas = await response.json()
			expect(Array.isArray(schemas)).toBe(true)
			expect(schemas.length).toBeGreaterThan(0)
		})

		test('GET /discovery/schemas includes example app schemas', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.getSchemas()
			const schemas = await response.json()

			const names = schemas.map((s: { name: string }) => s.name)
			// The mongoose example app registers Cat, Owner, Veterinarian schemas
			expect(names).toContain('Cat')
		})

		test('GET /discovery/schemas/:name returns schema metadata', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.getSchema('Cat')
			expect(response.ok()).toBeTruthy()

			const schema = await response.json()
			expect(schema).toHaveProperty('name', 'Cat')
			expect(schema).toHaveProperty('fields')
			expect(Array.isArray(schema.fields)).toBe(true)
		})

		test('GET /discovery/schemas/Cat has expected fields', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.getSchema('Cat')
			const schema = await response.json()

			const fieldNames = schema.fields.map((f: { name: string }) => f.name)
			expect(fieldNames).toContain('name')
			expect(fieldNames).toContain('breed')
			expect(fieldNames).toContain('weight')
		})
	})

	test.describe('Settings discovery', () => {
		test('GET /discovery/settings returns settings schemas', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.getSettingsSchemas()
			expect(response.ok()).toBeTruthy()

			const settings = await response.json()
			expect(Array.isArray(settings)).toBe(true)
			expect(settings.length).toBeGreaterThan(0)
		})

		test('GET /discovery/settings includes auth settings group', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.getSettingsSchemas()
			const settings = await response.json()

			const groups = settings.map((s: { group: string }) => s.group)
			expect(groups).toContain('auth')
		})
	})

	test.describe('Controller discovery', () => {
		test('GET /discovery/controllers returns list of controllers', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.getControllers()
			expect(response.ok()).toBeTruthy()

			const controllers = await response.json()
			expect(Array.isArray(controllers)).toBe(true)
			expect(controllers.length).toBeGreaterThan(0)
		})

		test('GET /discovery/controllers/:name returns controller details', async ({
			authenticatedApiClient,
		}) => {
			// Get list first to find a valid controller name
			const listRes = await authenticatedApiClient.getControllers()
			const controllers = await listRes.json()
			expect(controllers.length).toBeGreaterThan(0)

			const first = controllers[0] as { name: string }
			const response = await authenticatedApiClient.getController(first.name)
			expect(response.ok()).toBeTruthy()

			const controller = await response.json()
			expect(controller).toHaveProperty('name', first.name)
		})
	})

	test.describe('Authentication required', () => {
		test('GET /discovery/schemas requires authentication', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.get(`${apiBaseURL}/discovery/schemas`)
			expect(response.status()).toBe(401)
		})

		test('GET /discovery/controllers requires authentication', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.get(`${apiBaseURL}/discovery/controllers`)
			expect(response.status()).toBe(401)
		})
	})
})
