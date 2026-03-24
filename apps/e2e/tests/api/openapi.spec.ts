import { expect, test } from '../../src/fixtures/base.fixture'

test.describe('OpenAPI Spec', () => {
	test('GET /oas.json returns 200 with valid OpenAPI 3.0 spec', async ({
		request,
		apiBaseURL,
	}) => {
		const response = await request.get(`${apiBaseURL}/oas.json`)

		expect(response.ok()).toBeTruthy()
		expect(response.status()).toBe(200)

		const body = await response.json()
		expect(body.openapi).toBe('3.0.0')
		expect(body.info).toBeDefined()
		expect(body.info.title).toBeDefined()
		expect(body.paths).toBeDefined()
	})

	test('GET /oas.json returns JSON content-type', async ({
		request,
		apiBaseURL,
	}) => {
		const response = await request.get(`${apiBaseURL}/oas.json`)

		expect(response.ok()).toBeTruthy()
		expect(response.headers()['content-type']).toContain('application/json')
	})

	test('GET /api-docs returns 200 with Swagger UI HTML', async ({
		request,
		apiBaseURL,
	}) => {
		const response = await request.get(`${apiBaseURL}/api-docs`)

		expect(response.ok()).toBeTruthy()
		expect(response.status()).toBe(200)

		const body = await response.text()
		expect(body).toContain('swagger')
	})

	test('GET /oas.json spec contains security schemes', async ({
		request,
		apiBaseURL,
	}) => {
		const response = await request.get(`${apiBaseURL}/oas.json`)
		const body = await response.json()

		expect(body.components).toBeDefined()
		expect(body.components.securitySchemes).toBeDefined()

		const schemes = body.components.securitySchemes
		const schemeNames = Object.keys(schemes)

		// At least one security scheme defined (Bearer or ApiKey)
		expect(schemeNames.length).toBeGreaterThan(0)
	})

	test('GET /oas.json spec contains content API paths', async ({
		request,
		apiBaseURL,
	}) => {
		const response = await request.get(`${apiBaseURL}/oas.json`)
		const body = await response.json()

		const paths: string[] = Object.keys(body.paths ?? {})

		// At least one content path exists in the spec
		const contentPaths = paths.filter((p) => p.startsWith('/content'))
		expect(contentPaths.length).toBeGreaterThan(0)
	})

	test('GET /oas.json spec contains component schemas from discovered content types', async ({
		request,
		apiBaseURL,
	}) => {
		const response = await request.get(`${apiBaseURL}/oas.json`)
		const body = await response.json()

		expect(body.components?.schemas).toBeDefined()

		const schemaNames = Object.keys(body.components.schemas)

		// The spec should include content-type component schemas beyond the three base types
		// (Document, AuthResult, User are always present from the builder)
		expect(schemaNames.length).toBeGreaterThan(3)
	})
})
