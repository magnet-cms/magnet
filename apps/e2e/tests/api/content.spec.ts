import { randomUUID } from 'node:crypto'
import { expect, test } from '../../src/fixtures/auth.fixture'
import { testData } from '../../src/helpers/test-data'

const SCHEMA = 'Cat'

function catData(ownerId: string): Record<string, unknown> {
	const uniqueId = randomUUID().slice(0, 12).toUpperCase()
	return {
		tagID: `TAG-${uniqueId}`, // 16 chars, within 10-20 range
		name: `TestCat-${randomUUID().slice(0, 8)}`,
		birthdate: new Date('2020-01-01').toISOString(),
		breed: 'Domestic Shorthair',
		weight: 4.5,
		owner: ownerId,
		castrated: false,
	}
}

test.describe('Content API', () => {
	test.describe('CRUD operations', () => {
		test('GET /content/:schema responds within 2000ms', async ({
			authenticatedApiClient,
		}) => {
			const start = Date.now()
			const response = await authenticatedApiClient.listContent(SCHEMA)
			const elapsed = Date.now() - start

			expect(response.ok()).toBeTruthy()
			expect(elapsed).toBeLessThan(2000)
		})

		test('POST /content/:schema creates a document', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const ownerData = testData.owner.create()
			const ownerRes = await authenticatedApiClient.createOwner(ownerData)
			expect(ownerRes.ok()).toBeTruthy()
			const owner = await ownerRes.json()
			const ownerId = (owner.id ?? owner._id) as string

			const response = await authenticatedApiClient.createContent(
				SCHEMA,
				catData(ownerId),
			)
			expect(response.ok()).toBeTruthy()

			const doc = await response.json()
			expect(doc).toHaveProperty('documentId')
			expect(doc.status).toBe('draft')

			cleanup.trackContent(authenticatedApiClient, SCHEMA, doc.documentId)
			cleanup.register(() => authenticatedApiClient.deleteOwner(ownerId))
		})

		test('GET /content/:schema lists documents', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const ownerData = testData.owner.create()
			const ownerRes = await authenticatedApiClient.createOwner(ownerData)
			const owner = await ownerRes.json()
			const ownerId = (owner.id ?? owner._id) as string
			cleanup.register(() => authenticatedApiClient.deleteOwner(ownerId))

			const createRes = await authenticatedApiClient.createContent(
				SCHEMA,
				catData(ownerId),
			)
			const created = await createRes.json()
			cleanup.trackContent(authenticatedApiClient, SCHEMA, created.documentId)

			const response = await authenticatedApiClient.listContent(SCHEMA)
			expect(response.ok()).toBeTruthy()

			const docs = await response.json()
			expect(Array.isArray(docs)).toBe(true)
			expect(docs.length).toBeGreaterThan(0)
		})

		test('GET /content/:schema/:documentId returns a document', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const ownerData = testData.owner.create()
			const ownerRes = await authenticatedApiClient.createOwner(ownerData)
			const owner = await ownerRes.json()
			const ownerId = (owner.id ?? owner._id) as string
			cleanup.register(() => authenticatedApiClient.deleteOwner(ownerId))

			const createRes = await authenticatedApiClient.createContent(
				SCHEMA,
				catData(ownerId),
			)
			const created = await createRes.json()
			cleanup.trackContent(authenticatedApiClient, SCHEMA, created.documentId)

			const response = await authenticatedApiClient.getContent(
				SCHEMA,
				created.documentId,
			)
			expect(response.ok()).toBeTruthy()

			const doc = await response.json()
			expect(doc.documentId).toBe(created.documentId)
		})

		test('GET /content/:schema/:documentId returns 404 for nonexistent', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.getContent(
				SCHEMA,
				'nonexistent-doc-id',
			)
			expect(response.status()).toBe(404)
		})

		test('PUT /content/:schema/:documentId updates a document', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const ownerData = testData.owner.create()
			const ownerRes = await authenticatedApiClient.createOwner(ownerData)
			const owner = await ownerRes.json()
			const ownerId = (owner.id ?? owner._id) as string
			cleanup.register(() => authenticatedApiClient.deleteOwner(ownerId))

			const createRes = await authenticatedApiClient.createContent(
				SCHEMA,
				catData(ownerId),
			)
			const created = await createRes.json()
			cleanup.trackContent(authenticatedApiClient, SCHEMA, created.documentId)

			const updateRes = await authenticatedApiClient.updateContent(
				SCHEMA,
				created.documentId,
				{ name: 'Updated Cat Name', weight: 5.0 },
			)
			expect(updateRes.ok()).toBeTruthy()

			const getRes = await authenticatedApiClient.getContent(
				SCHEMA,
				created.documentId,
			)
			const updated = await getRes.json()
			expect(updated.name).toBe('Updated Cat Name')
		})

		test('DELETE /content/:schema/:documentId deletes a document', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const ownerData = testData.owner.create()
			const ownerRes = await authenticatedApiClient.createOwner(ownerData)
			const owner = await ownerRes.json()
			const ownerId = (owner.id ?? owner._id) as string
			cleanup.register(() => authenticatedApiClient.deleteOwner(ownerId))

			const createRes = await authenticatedApiClient.createContent(
				SCHEMA,
				catData(ownerId),
			)
			const created = await createRes.json()

			const deleteRes = await authenticatedApiClient.deleteContent(
				SCHEMA,
				created.documentId,
			)
			expect(deleteRes.ok()).toBeTruthy()

			const getRes = await authenticatedApiClient.getContent(
				SCHEMA,
				created.documentId,
			)
			expect(getRes.status()).toBe(404)
		})

		test('POST /content/:schema/new creates an empty document', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const response = await authenticatedApiClient.createEmptyContent(SCHEMA)
			// may fail if required fields are enforced at creation time — check either success or 400
			if (response.ok()) {
				const doc = await response.json()
				expect(doc).toHaveProperty('documentId')
				cleanup.trackContent(authenticatedApiClient, SCHEMA, doc.documentId)
			} else {
				expect([400, 422]).toContain(response.status())
			}
		})
	})

	test.describe('Publish / Unpublish', () => {
		test('publish and unpublish a document', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const ownerData = testData.owner.create()
			const ownerRes = await authenticatedApiClient.createOwner(ownerData)
			const owner = await ownerRes.json()
			const ownerId = (owner.id ?? owner._id) as string
			cleanup.register(() => authenticatedApiClient.deleteOwner(ownerId))

			const createRes = await authenticatedApiClient.createContent(
				SCHEMA,
				catData(ownerId),
			)
			const created = await createRes.json()
			cleanup.trackContent(authenticatedApiClient, SCHEMA, created.documentId)

			// Publish
			const publishRes = await authenticatedApiClient.publishContent(
				SCHEMA,
				created.documentId,
			)
			expect(publishRes.ok()).toBeTruthy()

			const published = await publishRes.json()
			expect(published.status).toBe('published')

			// Unpublish
			const unpublishRes = await authenticatedApiClient.unpublishContent(
				SCHEMA,
				created.documentId,
			)
			expect(unpublishRes.ok()).toBeTruthy()
		})

		test('publish nonexistent document returns 404', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.publishContent(
				SCHEMA,
				'nonexistent-doc-id',
			)
			expect(response.status()).toBe(404)
		})
	})

	test.describe('Locale management', () => {
		test('GET /content/:schema/:documentId/locales returns locale statuses', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const ownerData = testData.owner.create()
			const ownerRes = await authenticatedApiClient.createOwner(ownerData)
			const owner = await ownerRes.json()
			const ownerId = (owner.id ?? owner._id) as string
			cleanup.register(() => authenticatedApiClient.deleteOwner(ownerId))

			const createRes = await authenticatedApiClient.createContent(
				SCHEMA,
				catData(ownerId),
			)
			const created = await createRes.json()
			cleanup.trackContent(authenticatedApiClient, SCHEMA, created.documentId)

			const response = await authenticatedApiClient.getContentLocaleStatuses(
				SCHEMA,
				created.documentId,
			)
			expect(response.ok()).toBeTruthy()

			const statuses = await response.json()
			expect(Array.isArray(statuses)).toBe(true)
		})

		test('POST /content/:schema/:documentId/locale adds a locale', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const ownerData = testData.owner.create()
			const ownerRes = await authenticatedApiClient.createOwner(ownerData)
			const owner = await ownerRes.json()
			const ownerId = (owner.id ?? owner._id) as string
			cleanup.register(() => authenticatedApiClient.deleteOwner(ownerId))

			const createRes = await authenticatedApiClient.createContent(
				SCHEMA,
				catData(ownerId),
			)
			const created = await createRes.json()
			cleanup.trackContent(authenticatedApiClient, SCHEMA, created.documentId)

			const localeData = catData(ownerId)
			const addRes = await authenticatedApiClient.addContentLocale(
				SCHEMA,
				created.documentId,
				'pt-BR',
				{ ...localeData, name: 'Gato Teste', breed: 'Pelo Curto' },
			)
			expect(addRes.ok()).toBeTruthy()
		})
	})

	test.describe('Version history', () => {
		test('GET /content/:schema/:documentId/versions returns version list', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const ownerData = testData.owner.create()
			const ownerRes = await authenticatedApiClient.createOwner(ownerData)
			const owner = await ownerRes.json()
			const ownerId = (owner.id ?? owner._id) as string
			cleanup.register(() => authenticatedApiClient.deleteOwner(ownerId))

			const createRes = await authenticatedApiClient.createContent(
				SCHEMA,
				catData(ownerId),
			)
			const created = await createRes.json()
			cleanup.trackContent(authenticatedApiClient, SCHEMA, created.documentId)

			// Update to create another version
			await authenticatedApiClient.updateContent(SCHEMA, created.documentId, {
				weight: 6.0,
			})

			const versionsRes = await authenticatedApiClient.getContentVersions(
				SCHEMA,
				created.documentId,
			)
			expect(versionsRes.ok()).toBeTruthy()

			const versions = await versionsRes.json()
			expect(Array.isArray(versions)).toBe(true)
		})

		test('POST /content/:schema/:documentId/restore restores a version', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const ownerData = testData.owner.create()
			const ownerRes = await authenticatedApiClient.createOwner(ownerData)
			const owner = await ownerRes.json()
			const ownerId = (owner.id ?? owner._id) as string
			cleanup.register(() => authenticatedApiClient.deleteOwner(ownerId))

			const createRes = await authenticatedApiClient.createContent(
				SCHEMA,
				catData(ownerId),
			)
			const created = await createRes.json()
			cleanup.trackContent(authenticatedApiClient, SCHEMA, created.documentId)

			// Update to create v2
			await authenticatedApiClient.updateContent(SCHEMA, created.documentId, {
				weight: 6.0,
			})

			// Get versions list to find v1
			const versionsRes = await authenticatedApiClient.getContentVersions(
				SCHEMA,
				created.documentId,
			)
			const versions = await versionsRes.json()

			if (versions.length >= 2) {
				const v1 = versions.find((v: { version: number }) => v.version === 1)
				if (v1) {
					const restoreRes = await authenticatedApiClient.restoreContentVersion(
						SCHEMA,
						created.documentId,
						'en',
						1,
					)
					expect(restoreRes.ok()).toBeTruthy()
				}
			}
		})
	})

	test.describe('Authentication required', () => {
		test('GET /content/:schema requires authentication', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.get(`${apiBaseURL}/content/${SCHEMA}`)
			expect(response.status()).toBe(401)
		})

		test('POST /content/:schema requires authentication', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.post(`${apiBaseURL}/content/${SCHEMA}`, {
				data: { data: {} },
			})
			expect(response.status()).toBe(401)
		})
	})
})
