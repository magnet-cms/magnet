import { randomUUID } from 'node:crypto'
import { expect, test } from '../../src/fixtures/auth.fixture'

// History is tracked at the collection level — use a known collection name
const COLLECTION = 'cats'

function makeDocId() {
	return `doc-${randomUUID().slice(0, 12)}`
}

function makeVersionData(): Record<string, unknown> {
	return {
		name: `TestCat-${randomUUID().slice(0, 8)}`,
		breed: 'Domestic Shorthair',
		weight: 4.5,
	}
}

test.describe('History API', () => {
	test.describe('Version CRUD', () => {
		test('POST /history/version creates a version entry', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const docId = makeDocId()
			const response = await authenticatedApiClient.createVersion({
				documentId: docId,
				collection: COLLECTION,
				data: makeVersionData(),
				status: 'draft',
			})
			expect(response.ok()).toBeTruthy()

			const version = await response.json()
			expect(version).toHaveProperty('documentId', docId)
			expect(version).toHaveProperty('collection', COLLECTION)
			expect(version).toHaveProperty('version')
			expect(version.status).toBe('draft')

			cleanup.register(() =>
				authenticatedApiClient.deleteVersion(version._id ?? version.id),
			)
		})

		test('GET /history/versions/:documentId returns versions for a document', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const docId = makeDocId()

			// Create two versions
			const v1Res = await authenticatedApiClient.createVersion({
				documentId: docId,
				collection: COLLECTION,
				data: makeVersionData(),
				status: 'draft',
			})
			const v1 = await v1Res.json()
			cleanup.register(() =>
				authenticatedApiClient.deleteVersion(v1._id ?? v1.id),
			)

			const v2Res = await authenticatedApiClient.createVersion({
				documentId: docId,
				collection: COLLECTION,
				data: { ...makeVersionData(), weight: 5.5 },
				status: 'draft',
			})
			const v2 = await v2Res.json()
			cleanup.register(() =>
				authenticatedApiClient.deleteVersion(v2._id ?? v2.id),
			)

			const response = await authenticatedApiClient.getVersions(
				docId,
				COLLECTION,
			)
			expect(response.ok()).toBeTruthy()

			const versions = await response.json()
			expect(Array.isArray(versions)).toBe(true)
			expect(versions.length).toBeGreaterThanOrEqual(2)
		})

		test('GET /history/versions/:documentId/latest returns latest version', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const docId = makeDocId()

			const createRes = await authenticatedApiClient.createVersion({
				documentId: docId,
				collection: COLLECTION,
				data: makeVersionData(),
				status: 'draft',
			})
			const created = await createRes.json()
			cleanup.register(() =>
				authenticatedApiClient.deleteVersion(created._id ?? created.id),
			)

			const response = await authenticatedApiClient.getLatestVersion(
				docId,
				COLLECTION,
				'draft',
			)
			expect(response.ok()).toBeTruthy()

			const latest = await response.json()
			expect(latest).toHaveProperty('documentId', docId)
		})

		test('GET /history/version/:versionId returns version by ID', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const docId = makeDocId()
			const createRes = await authenticatedApiClient.createVersion({
				documentId: docId,
				collection: COLLECTION,
				data: makeVersionData(),
				status: 'draft',
			})
			const created = await createRes.json()
			const versionId = created._id ?? created.id
			cleanup.register(() => authenticatedApiClient.deleteVersion(versionId))

			const response = await authenticatedApiClient.getVersionById(versionId)
			expect(response.ok()).toBeTruthy()

			const version = await response.json()
			expect(version.documentId).toBe(docId)
		})

		test('PUT /history/version/:id/publish publishes a version', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const docId = makeDocId()
			const createRes = await authenticatedApiClient.createVersion({
				documentId: docId,
				collection: COLLECTION,
				data: makeVersionData(),
				status: 'draft',
			})
			const created = await createRes.json()
			const versionId = created._id ?? created.id
			cleanup.register(() => authenticatedApiClient.deleteVersion(versionId))

			const publishRes = await authenticatedApiClient.publishVersion(versionId)
			expect(publishRes.ok()).toBeTruthy()

			const published = await publishRes.json()
			expect(published.status).toBe('published')
		})

		test('PUT /history/version/:id/archive archives a version', async ({
			authenticatedApiClient,
			cleanup,
		}) => {
			const docId = makeDocId()
			const createRes = await authenticatedApiClient.createVersion({
				documentId: docId,
				collection: COLLECTION,
				data: makeVersionData(),
				status: 'draft',
			})
			const created = await createRes.json()
			const versionId = created._id ?? created.id
			cleanup.register(() => authenticatedApiClient.deleteVersion(versionId))

			const archiveRes = await authenticatedApiClient.archiveVersion(versionId)
			expect(archiveRes.ok()).toBeTruthy()

			const archived = await archiveRes.json()
			expect(archived.status).toBe('archived')
		})

		test('DELETE /history/version/:id deletes a version', async ({
			authenticatedApiClient,
		}) => {
			const docId = makeDocId()
			const createRes = await authenticatedApiClient.createVersion({
				documentId: docId,
				collection: COLLECTION,
				data: makeVersionData(),
				status: 'draft',
			})
			const created = await createRes.json()
			const versionId = created._id ?? created.id

			const deleteRes = await authenticatedApiClient.deleteVersion(versionId)
			expect(deleteRes.ok()).toBeTruthy()

			const getRes = await authenticatedApiClient.getVersionById(versionId)
			// Should return null/empty body or 404
			if (getRes.ok()) {
				const body = await getRes.json()
				expect(body).toBeNull()
			} else {
				expect(getRes.status()).toBe(404)
			}
		})
	})

	test.describe('Versioning settings', () => {
		test('GET /history/settings returns versioning configuration', async ({
			authenticatedApiClient,
		}) => {
			const response = await authenticatedApiClient.getVersioningSettings()
			expect(response.ok()).toBeTruthy()

			const settings = await response.json()
			expect(settings).toHaveProperty('maxVersions')
			expect(settings).toHaveProperty('draftsEnabled')
			expect(settings).toHaveProperty('requireApproval')
			expect(settings).toHaveProperty('autoPublish')
		})
	})

	test.describe('Authentication required', () => {
		test('GET /history/versions/:id requires authentication', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.get(
				`${apiBaseURL}/history/versions/some-id?collection=${COLLECTION}`,
			)
			expect(response.status()).toBe(401)
		})

		test('POST /history/version requires authentication', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.post(`${apiBaseURL}/history/version`, {
				data: {
					documentId: 'x',
					collection: COLLECTION,
					data: {},
				},
			})
			expect(response.status()).toBe(401)
		})
	})
})
