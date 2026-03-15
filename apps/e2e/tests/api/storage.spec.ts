import { expect, test } from '../../src/fixtures/auth.fixture'

const TEMPLATE_NAME = process.env.TEMPLATE_NAME || ''

/** Generate a minimal 1x1 red PNG image as a Buffer */
function createTestPng(): Buffer {
	// Minimal valid PNG: 1x1 pixel, red, RGBA
	const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
	const ihdr = Buffer.from([
		0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01,
		0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
		0xde, 0x00,
	])
	const idat = Buffer.from([
		0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8,
		0xcf, 0xc0, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33,
	])
	const iend = Buffer.from([
		0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
	])
	return Buffer.concat([header, ihdr, idat, iend])
}

test.describe('Storage API', () => {
	const testPng = createTestPng()

	test('upload file and verify metadata', async ({
		authenticatedApiClient,
		cleanup,
	}) => {
		const filename = `e2e-test-${Date.now()}.png`

		const response = await authenticatedApiClient.uploadMedia(
			testPng,
			filename,
			'image/png',
			{ alt: 'E2E test image', tags: ['e2e', 'test'] },
		)

		expect(response.ok()).toBeTruthy()

		const body = await response.json()
		expect(body.filename).toBeTruthy()
		expect(body.originalFilename).toBe(filename)
		expect(body.mimeType).toBe('image/png')
		expect(body.size).toBeGreaterThan(0)
		expect(body.url).toBeTruthy()

		// Clean up
		const mediaId = body.id || body._id
		if (mediaId) {
			cleanup.trackMedia(authenticatedApiClient, mediaId)
		}
	})

	test('upload and list files', async ({ authenticatedApiClient, cleanup }) => {
		const filename = `e2e-list-${Date.now()}.png`

		// Upload
		const uploadResponse = await authenticatedApiClient.uploadMedia(
			testPng,
			filename,
			'image/png',
		)
		expect(uploadResponse.ok()).toBeTruthy()
		const uploaded = await uploadResponse.json()
		const mediaId = uploaded.id || uploaded._id

		if (mediaId) {
			cleanup.trackMedia(authenticatedApiClient, mediaId)
		}

		// List
		const listResponse = await authenticatedApiClient.getMediaList()
		expect(listResponse.ok()).toBeTruthy()
		const list = await listResponse.json()
		expect(list.items).toBeDefined()
		expect(list.items.length).toBeGreaterThan(0)

		// Verify our file appears
		const found = list.items.find(
			(item: { originalFilename: string }) =>
				item.originalFilename === filename,
		)
		expect(found).toBeTruthy()
	})

	test('upload and retrieve file content', async ({
		authenticatedApiClient,
		cleanup,
	}) => {
		const filename = `e2e-retrieve-${Date.now()}.png`

		const uploadResponse = await authenticatedApiClient.uploadMedia(
			testPng,
			filename,
			'image/png',
		)
		expect(uploadResponse.ok()).toBeTruthy()
		const uploaded = await uploadResponse.json()
		const mediaId = uploaded.id || uploaded._id

		if (mediaId) {
			cleanup.trackMedia(authenticatedApiClient, mediaId)

			// Retrieve file
			const fileResponse = await authenticatedApiClient.getMediaFile(mediaId)
			expect(fileResponse.ok()).toBeTruthy()
		}
	})

	test('upload and delete file', async ({ authenticatedApiClient }) => {
		const filename = `e2e-delete-${Date.now()}.png`

		// Upload
		const uploadResponse = await authenticatedApiClient.uploadMedia(
			testPng,
			filename,
			'image/png',
		)
		expect(uploadResponse.ok()).toBeTruthy()
		const uploaded = await uploadResponse.json()
		const mediaId = uploaded.id || uploaded._id

		// Delete
		const deleteResponse = await authenticatedApiClient.deleteMedia(mediaId)
		expect(deleteResponse.ok()).toBeTruthy()

		// Verify gone
		const getResponse = await authenticatedApiClient.getMedia(mediaId)
		expect(getResponse.ok()).toBeFalsy()
	})

	test('upload with folder organizes files', async ({
		authenticatedApiClient,
		cleanup,
	}) => {
		const folder = `e2e-folder-${Date.now()}`
		const filename = `e2e-folder-file-${Date.now()}.png`

		const uploadResponse = await authenticatedApiClient.uploadMedia(
			testPng,
			filename,
			'image/png',
			{ folder },
		)
		expect(uploadResponse.ok()).toBeTruthy()
		const uploaded = await uploadResponse.json()
		expect(uploaded.folder).toBe(folder)

		const mediaId = uploaded.id || uploaded._id
		if (mediaId) {
			cleanup.trackMedia(authenticatedApiClient, mediaId)
		}
	})

	test('upload with tags and alt text preserves metadata', async ({
		authenticatedApiClient,
		cleanup,
	}) => {
		const filename = `e2e-meta-${Date.now()}.png`
		const tags = ['e2e-tag-1', 'e2e-tag-2']
		const alt = 'E2E metadata test image'

		const uploadResponse = await authenticatedApiClient.uploadMedia(
			testPng,
			filename,
			'image/png',
			{ tags, alt },
		)
		expect(uploadResponse.ok()).toBeTruthy()
		const uploaded = await uploadResponse.json()
		const mediaId = uploaded.id || uploaded._id

		if (mediaId) {
			cleanup.trackMedia(authenticatedApiClient, mediaId)

			// Re-fetch to verify persistence
			const getResponse = await authenticatedApiClient.getMedia(mediaId)
			expect(getResponse.ok()).toBeTruthy()
			const media = await getResponse.json()
			expect(media.alt).toBe(alt)
			if (media.tags) {
				expect(media.tags).toEqual(expect.arrayContaining(tags))
			}
		}
	})

	test('template-specific URL format', async ({
		authenticatedApiClient,
		cleanup,
	}) => {
		test.skip(!TEMPLATE_NAME, 'TEMPLATE_NAME not set')

		const filename = `e2e-url-${Date.now()}.png`

		const uploadResponse = await authenticatedApiClient.uploadMedia(
			testPng,
			filename,
			'image/png',
		)
		expect(uploadResponse.ok()).toBeTruthy()
		const uploaded = await uploadResponse.json()
		const mediaId = uploaded.id || uploaded._id

		if (mediaId) {
			cleanup.trackMedia(authenticatedApiClient, mediaId)
		}

		// Template-specific URL assertions
		if (TEMPLATE_NAME === 'mongoose') {
			// Local storage: URL starts with /media/
			expect(uploaded.url).toMatch(/^\/media\//)
		}
		// S3/MinIO and Supabase URLs vary by configuration, just verify non-empty
		expect(uploaded.url).toBeTruthy()
	})
})
