import { randomUUID } from 'node:crypto'
import { expect, test } from '../../src/fixtures/auth.fixture'

/**
 * Generate a valid playground schema name.
 * Must match ^[A-Z][A-Za-z0-9]*$ and be unique per test run.
 */
function schemaName(prefix = 'Test'): string {
	const suffix = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
	return `${prefix}${suffix}`
}

/** A minimal valid field for schema creation */
function textField(name = 'title') {
	return {
		name,
		displayName: name.charAt(0).toUpperCase() + name.slice(1),
		type: 'text' as const,
		tsType: 'string',
		prop: { required: true },
		ui: { type: 'text', label: name.charAt(0).toUpperCase() + name.slice(1) },
		validations: [],
	}
}

/** Minimal CreateSchemaDto */
function minimalSchema(name: string) {
	return {
		name,
		fields: [textField('title')],
	}
}

test.describe('Playground API (Content Builder plugin)', () => {
	test.describe('Public access', () => {
		test('GET /playground/schemas is publicly accessible', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.get(`${apiBaseURL}/playground/schemas`)
			expect(response.ok()).toBeTruthy()
			expect(response.status()).toBe(200)
		})

		test('POST /playground/schemas is accessible without authentication', async ({
			request,
			apiBaseURL,
		}) => {
			const name = schemaName()
			const response = await request.post(`${apiBaseURL}/playground/schemas`, {
				data: minimalSchema(name),
			})
			// Endpoint does not require auth — request is processed (may succeed or fail on validation)
			expect(response.status()).not.toBe(401)
		})

		test('POST /playground/preview is accessible without authentication', async ({
			request,
			apiBaseURL,
		}) => {
			const name = schemaName()
			const response = await request.post(`${apiBaseURL}/playground/preview`, {
				data: minimalSchema(name),
			})
			// Endpoint does not require auth — request is processed (may succeed or fail on validation)
			expect(response.status()).not.toBe(401)
		})
	})

	test.describe('CRUD operations', () => {
		test('GET /playground/schemas returns list', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.listPlaygroundSchemas()
			expect(response.ok()).toBeTruthy()

			const schemas = await response.json()
			expect(Array.isArray(schemas)).toBe(true)
		})

		test('POST /playground/schemas creates a schema', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const name = schemaName()
			const response = await authenticatedApiClient.createPlaygroundSchema(
				minimalSchema(name),
			)

			expect(response.ok()).toBeTruthy()

			const created = await response.json()
			expect(created).toHaveProperty('name', name)
			expect(created).toHaveProperty('fields')

			// Cleanup: delete the created schema
			cleanup.register(() =>
				authenticatedApiClient.deletePlaygroundSchema(name),
			)
		})

		test('GET /playground/schemas/:name returns schema details', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const name = schemaName()
			await authenticatedApiClient.createPlaygroundSchema(minimalSchema(name))
			cleanup.register(() =>
				authenticatedApiClient.deletePlaygroundSchema(name),
			)

			const response = await authenticatedApiClient.getPlaygroundSchema(name)
			expect(response.ok()).toBeTruthy()

			const schema = await response.json()
			expect(schema).toHaveProperty('name', name)
			expect(schema).toHaveProperty('fields')
			expect(Array.isArray(schema.fields)).toBe(true)
		})

		test('PUT /playground/schemas/:name updates a schema', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const name = schemaName()
			await authenticatedApiClient.createPlaygroundSchema(minimalSchema(name))
			cleanup.register(() =>
				authenticatedApiClient.deletePlaygroundSchema(name),
			)

			const updatedSchema = {
				name,
				fields: [textField('title'), textField('description')],
			}

			const response = await authenticatedApiClient.updatePlaygroundSchema(
				name,
				updatedSchema,
			)
			expect(response.ok()).toBeTruthy()

			const updated = await response.json()
			expect(updated).toHaveProperty('name', name)
		})

		test('DELETE /playground/schemas/:name removes the schema', async ({
			authenticatedApiClient,
		}) => {
			const name = schemaName()
			await authenticatedApiClient.createPlaygroundSchema(minimalSchema(name))

			const deleteResponse =
				await authenticatedApiClient.deletePlaygroundSchema(name)
			expect(deleteResponse.ok()).toBeTruthy()

			const body = await deleteResponse.json()
			expect(body).toHaveProperty('success', true)

			// Verify it no longer exists
			const getResponse = await authenticatedApiClient.getPlaygroundSchema(name)
			expect(getResponse.status()).toBe(404)
		})

		test('created schema appears in list', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const name = schemaName()
			await authenticatedApiClient.createPlaygroundSchema(minimalSchema(name))
			cleanup.register(() =>
				authenticatedApiClient.deletePlaygroundSchema(name),
			)

			const listResponse = await authenticatedApiClient.listPlaygroundSchemas()
			const schemas = await listResponse.json()
			const names = (schemas as Array<{ name: string }>).map((s) => s.name)
			expect(names).toContain(name)
		})
	})

	test.describe('Error cases', () => {
		test('GET /playground/schemas/:name returns 404 for nonexistent schema', async ({
			authenticatedApiClient,
		}) => {
			const response =
				await authenticatedApiClient.getPlaygroundSchema('NonexistentSchema')
			expect(response.status()).toBe(404)
		})

		test('POST /playground/schemas returns 400 for invalid schema name (lowercase start)', async ({
			authenticatedApiClient,
		}) => {
			const invalidName = 'invalidname'
			const response = await authenticatedApiClient.createPlaygroundSchema({
				name: invalidName,
				fields: [textField()],
			})
			expect(response.status()).toBe(400)
		})

		test('POST /playground/schemas returns 400 for invalid schema name (with spaces)', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.createPlaygroundSchema({
				name: 'Invalid Name',
				fields: [textField()],
			})
			expect(response.status()).toBe(400)
		})

		test('POST /playground/schemas returns 409 for duplicate schema name', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const name = schemaName()
			await authenticatedApiClient.createPlaygroundSchema(minimalSchema(name))
			cleanup.register(() =>
				authenticatedApiClient.deletePlaygroundSchema(name),
			)

			// Try to create the same schema again
			const duplicateResponse =
				await authenticatedApiClient.createPlaygroundSchema(minimalSchema(name))
			expect(duplicateResponse.status()).toBe(409)
		})

		test('DELETE /playground/schemas/:name returns 404 for nonexistent schema', async ({
			authenticatedApiClient,
		}) => {
			const response =
				await authenticatedApiClient.deletePlaygroundSchema('NonexistentSchema')
			expect(response.status()).toBe(404)
		})

		test('PUT /playground/schemas/:name returns 404 for nonexistent schema', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.updatePlaygroundSchema(
				'NonexistentSchema',
				{ name: 'NonexistentSchema', fields: [textField()] },
			)
			expect(response.status()).toBe(404)
		})
	})

	test.describe('Preview endpoint', () => {
		test('POST /playground/preview generates code preview', async ({
			authenticatedApiClient,
		}) => {
			const name = schemaName('Preview')
			const response = await authenticatedApiClient.previewPlaygroundCode(
				minimalSchema(name),
			)

			expect(response.ok()).toBeTruthy()

			const preview = await response.json()
			expect(preview).toHaveProperty('code')
			expect(typeof preview.code).toBe('string')
			expect(preview.code.length).toBeGreaterThan(0)
		})

		test('POST /playground/preview does not persist schema', async ({
			authenticatedApiClient,
		}) => {
			const name = schemaName('Preview')
			await authenticatedApiClient.previewPlaygroundCode(minimalSchema(name))

			// Schema should NOT exist after preview
			const getResponse = await authenticatedApiClient.getPlaygroundSchema(name)
			expect(getResponse.status()).toBe(404)
		})
	})
})
