import { expect, test } from '../../src/fixtures/base.fixture'
import type { MediaItem, PaginatedMedia } from '../../src/helpers/api-client'
import { testData } from '../../src/helpers/test-data'

// Create a simple test image buffer (1x1 red pixel PNG)
const createTestImage = (): Buffer => {
	// Minimal valid PNG: 1x1 red pixel
	return Buffer.from([
		0x89,
		0x50,
		0x4e,
		0x47,
		0x0d,
		0x0a,
		0x1a,
		0x0a, // PNG signature
		0x00,
		0x00,
		0x00,
		0x0d,
		0x49,
		0x48,
		0x44,
		0x52, // IHDR chunk header
		0x00,
		0x00,
		0x00,
		0x01,
		0x00,
		0x00,
		0x00,
		0x01, // 1x1 dimensions
		0x08,
		0x02,
		0x00,
		0x00,
		0x00,
		0x90,
		0x77,
		0x53, // bit depth, color type, etc
		0xde,
		0x00,
		0x00,
		0x00,
		0x0c,
		0x49,
		0x44,
		0x41, // IDAT chunk header
		0x54,
		0x08,
		0xd7,
		0x63,
		0xf8,
		0xcf,
		0xc0,
		0x00, // compressed image data (red pixel)
		0x00,
		0x00,
		0x03,
		0x00,
		0x01,
		0x00,
		0x18,
		0xdd, // checksum
		0x8d,
		0xb4,
		0x00,
		0x00,
		0x00,
		0x00,
		0x49,
		0x45, // IEND chunk
		0x4e,
		0x44,
		0xae,
		0x42,
		0x60,
		0x82,
	])
}

// Create a simple text file buffer
const createTestTextFile = (): Buffer => {
	return Buffer.from('Hello, this is a test file content.')
}

test.describe('Media API', () => {
	let authToken: string

	test.beforeEach(async ({ apiClient }) => {
		// Setup authentication
		const status = await apiClient.getAuthStatus()
		if (status.requiresSetup) {
			const userData = testData.user.create()
			const auth = await apiClient.register(userData)
			authToken = auth.access_token
		} else {
			// Try to login with default test user
			try {
				const auth = await apiClient.login('test@example.com', 'password123')
				authToken = auth.access_token
			} catch {
				// If login fails, try registration
				const userData = testData.user.create()
				const auth = await apiClient.register(userData)
				authToken = auth.access_token
			}
		}
		apiClient.setToken(authToken)
	})

	test('GET /media returns paginated media list', async ({ apiClient }) => {
		const response = await apiClient.getMediaList()

		expect(response.ok()).toBeTruthy()

		const data: PaginatedMedia = await response.json()
		expect(data).toHaveProperty('items')
		expect(data).toHaveProperty('total')
		expect(data).toHaveProperty('page')
		expect(data).toHaveProperty('limit')
		expect(data).toHaveProperty('totalPages')
		expect(Array.isArray(data.items)).toBe(true)
	})

	test('GET /media supports pagination parameters', async ({ apiClient }) => {
		const response = await apiClient.getMediaList({ page: 1, limit: 5 })

		expect(response.ok()).toBeTruthy()

		const data: PaginatedMedia = await response.json()
		expect(data.page).toBe(1)
		expect(data.limit).toBe(5)
	})

	test('POST /media/upload uploads a file successfully', async ({
		apiClient,
	}) => {
		const testImage = createTestImage()
		const filename = `test-${Date.now()}.png`

		const response = await apiClient.uploadMedia(
			testImage,
			filename,
			'image/png',
			{
				folder: 'test-uploads',
				alt: 'Test image',
			},
		)

		expect(response.ok()).toBeTruthy()

		const media: MediaItem = await response.json()
		expect(media).toHaveProperty('id')
		expect(media.originalFilename).toBe(filename)
		expect(media.mimeType).toBe('image/png')
		expect(media.folder).toBe('test-uploads')
		expect(media.alt).toBe('Test image')
	})

	test('GET /media/:id returns a single media item', async ({ apiClient }) => {
		// First upload a file
		const testImage = createTestImage()
		const filename = `test-get-${Date.now()}.png`

		const uploadResponse = await apiClient.uploadMedia(
			testImage,
			filename,
			'image/png',
		)
		const uploaded: MediaItem = await uploadResponse.json()

		// Then fetch it
		const response = await apiClient.getMedia(uploaded.id)

		expect(response.ok()).toBeTruthy()

		const media: MediaItem = await response.json()
		expect(media.id).toBe(uploaded.id)
		expect(media.originalFilename).toBe(filename)
	})

	test('PUT /media/:id updates media metadata', async ({ apiClient }) => {
		// First upload a file
		const testImage = createTestImage()
		const filename = `test-update-${Date.now()}.png`

		const uploadResponse = await apiClient.uploadMedia(
			testImage,
			filename,
			'image/png',
		)
		const uploaded: MediaItem = await uploadResponse.json()

		// Then update it
		const response = await apiClient.updateMedia(uploaded.id, {
			alt: 'Updated alt text',
			tags: ['tag1', 'tag2'],
			folder: 'updated-folder',
		})

		expect(response.ok()).toBeTruthy()

		const media: MediaItem = await response.json()
		expect(media.alt).toBe('Updated alt text')
		expect(media.tags).toContain('tag1')
		expect(media.tags).toContain('tag2')
		expect(media.folder).toBe('updated-folder')
	})

	test('DELETE /media/:id deletes a media item', async ({ apiClient }) => {
		// First upload a file
		const testImage = createTestImage()
		const filename = `test-delete-${Date.now()}.png`

		const uploadResponse = await apiClient.uploadMedia(
			testImage,
			filename,
			'image/png',
		)
		const uploaded: MediaItem = await uploadResponse.json()

		// Then delete it
		const deleteResponse = await apiClient.deleteMedia(uploaded.id)

		expect(deleteResponse.ok()).toBeTruthy()

		// Verify it's deleted
		const getResponse = await apiClient.getMedia(uploaded.id)
		expect(getResponse.status()).toBe(404)
	})

	test('GET /media/meta/folders returns folder list', async ({ apiClient }) => {
		const response = await apiClient.getMediaFolders()

		expect(response.ok()).toBeTruthy()

		const folders = await response.json()
		expect(Array.isArray(folders)).toBe(true)
	})

	test('GET /media/meta/tags returns tag list', async ({ apiClient }) => {
		const response = await apiClient.getMediaTags()

		expect(response.ok()).toBeTruthy()

		const tags = await response.json()
		expect(Array.isArray(tags)).toBe(true)
	})

	test('GET /media/meta/stats returns storage statistics', async ({
		apiClient,
	}) => {
		const response = await apiClient.getMediaStats()

		expect(response.ok()).toBeTruthy()

		const stats = await response.json()
		expect(stats).toHaveProperty('totalFiles')
		expect(stats).toHaveProperty('totalSize')
	})

	test('GET /media/file/:id serves the file (public endpoint)', async ({
		apiClient,
		request,
		apiBaseURL,
	}) => {
		// First upload a file
		const testImage = createTestImage()
		const filename = `test-serve-${Date.now()}.png`

		const uploadResponse = await apiClient.uploadMedia(
			testImage,
			filename,
			'image/png',
		)
		const uploaded: MediaItem = await uploadResponse.json()

		// Fetch file without auth (public endpoint)
		const response = await request.get(
			`${apiBaseURL}/media/file/${uploaded.id}`,
		)

		expect(response.ok()).toBeTruthy()
		expect(response.headers()['content-type']).toBe('image/png')
	})

	test('GET /media/file/:id supports transform parameters', async ({
		apiClient,
		request,
		apiBaseURL,
	}) => {
		// First upload a file
		const testImage = createTestImage()
		const filename = `test-transform-${Date.now()}.png`

		const uploadResponse = await apiClient.uploadMedia(
			testImage,
			filename,
			'image/png',
		)
		const uploaded: MediaItem = await uploadResponse.json()

		// Request transformed image
		const response = await request.get(
			`${apiBaseURL}/media/file/${uploaded.id}?w=100&f=webp`,
		)

		expect(response.ok()).toBeTruthy()
		// Note: transform might fail for 1x1 pixel image, but endpoint should respond
	})

	test('POST /media/upload returns 401 without authentication', async ({
		request,
		apiBaseURL,
	}) => {
		const testImage = createTestImage()

		const response = await request.post(`${apiBaseURL}/media/upload`, {
			multipart: {
				file: {
					name: 'test.png',
					mimeType: 'image/png',
					buffer: testImage,
				},
			},
		})

		expect(response.status()).toBe(401)
	})

	test('GET /media supports search parameter', async ({ apiClient }) => {
		// Upload a file with a unique name
		const testImage = createTestImage()
		const uniqueName = `searchable-${Date.now()}.png`

		await apiClient.uploadMedia(testImage, uniqueName, 'image/png')

		// Search for it
		const response = await apiClient.getMediaList({ search: 'searchable' })

		expect(response.ok()).toBeTruthy()

		const data: PaginatedMedia = await response.json()
		const found = data.items.some((item) =>
			item.originalFilename.includes('searchable'),
		)
		expect(found).toBe(true)
	})

	test('GET /media supports folder filter', async ({ apiClient }) => {
		// Upload a file to a specific folder
		const testImage = createTestImage()
		const folderName = `folder-${Date.now()}`

		await apiClient.uploadMedia(testImage, 'test.png', 'image/png', {
			folder: folderName,
		})

		// Filter by folder
		const response = await apiClient.getMediaList({ folder: folderName })

		expect(response.ok()).toBeTruthy()

		const data: PaginatedMedia = await response.json()
		expect(data.items.every((item) => item.folder === folderName)).toBe(true)
	})
})
