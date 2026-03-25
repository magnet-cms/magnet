/**
 * E2E tests for media encryption and access control.
 *
 * Tests:
 * 1. Non-encrypted uploads continue to work (backward compat)
 * 2. Encrypted upload stores isEncrypted:true and sets ownerId (requires vault)
 * 3. Encrypted file auto-creates private/{userId} folder
 * 4. Owner can GET their encrypted media metadata
 * 5. Non-owner (different authenticated user) gets 403 on encrypted media
 * 6. Unauthenticated request gets 403 on encrypted media
 */
import type { APIResponse } from '@playwright/test'
import { expect, test } from '../../src/fixtures/auth.fixture'
import type { MediaItem } from '../../src/helpers/api-client'
import { testData } from '../../src/helpers/test-data'

const createTestFile = (): Buffer =>
	Buffer.from('PII document content — encrypted at rest')

function skipUnlessEncryptedUploadOk(response: APIResponse): void {
	if (!response.ok()) {
		test.skip(
			true,
			`Encrypted media upload not available in this environment (HTTP ${response.status()})`,
		)
	}
}

test.describe('Media Encryption & Access Control', () => {
	let ownerUserId: string

	test.beforeEach(async ({ apiClient }) => {
		const userData = testData.user.create()
		const auth = await apiClient.register(userData)
		apiClient.setToken(auth.access_token)

		const meResponse = await apiClient.getMe()
		if (meResponse.ok()) {
			const me = await meResponse.json()
			ownerUserId = me.id
		}
	})

	test('non-encrypted upload works as before (backward compat)', async ({
		apiClient,
	}) => {
		const response = await apiClient.uploadMedia(
			createTestFile(),
			`plain-${Date.now()}.txt`,
			'text/plain',
			{ folder: 'test-plain' },
		)

		expect(response.ok()).toBeTruthy()

		const media: MediaItem = await response.json()
		expect(media).toHaveProperty('id')
		expect(media.isEncrypted ?? false).toBe(false)
	})

	test('encrypted upload with vault returns isEncrypted:true', async ({
		apiClient,
	}) => {
		const response = await apiClient.uploadMedia(
			createTestFile(),
			`encrypted-${Date.now()}.txt`,
			'text/plain',
			{ encrypt: true },
		)

		skipUnlessEncryptedUploadOk(response)

		const media: MediaItem = await response.json()
		expect(media.isEncrypted).toBe(true)
		expect(media.ownerId).toBe(ownerUserId)
	})

	test('encrypted upload auto-creates private/{userId} folder', async ({
		apiClient,
	}) => {
		const response = await apiClient.uploadMedia(
			createTestFile(),
			`private-folder-test-${Date.now()}.txt`,
			'text/plain',
			{ encrypt: true },
		)

		skipUnlessEncryptedUploadOk(response)

		const media: MediaItem = await response.json()
		// File should be placed in private/{userId} folder automatically
		expect(media.folder).toBe(`private/${ownerUserId}`)
	})

	test('owner can access their encrypted media metadata', async ({
		apiClient,
	}) => {
		// Upload as owner
		const uploadResponse = await apiClient.uploadMedia(
			createTestFile(),
			`owner-access-${Date.now()}.txt`,
			'text/plain',
			{ encrypt: true },
		)

		skipUnlessEncryptedUploadOk(uploadResponse)
		const media: MediaItem = await uploadResponse.json()

		// Owner can GET the metadata
		const getResponse = await apiClient.getMedia(media.id)
		expect(getResponse.ok()).toBeTruthy()
	})

	test('non-owner gets 403 on encrypted media metadata', async ({
		apiClient,
	}) => {
		// Upload as owner
		const uploadResponse = await apiClient.uploadMedia(
			createTestFile(),
			`non-owner-test-${Date.now()}.txt`,
			'text/plain',
			{ encrypt: true },
		)

		skipUnlessEncryptedUploadOk(uploadResponse)
		const media: MediaItem = await uploadResponse.json()

		// Register a second user
		const otherUser = testData.user.create()
		const otherAuth = await apiClient.register(otherUser)
		apiClient.setToken(otherAuth.access_token)

		// Other user should be denied
		const getResponse = await apiClient.getMedia(media.id)
		expect(getResponse.status()).toBe(403)
	})

	test('unauthenticated request gets 403 on encrypted media', async ({
		apiClient,
	}) => {
		// Upload as owner first
		const uploadResponse = await apiClient.uploadMedia(
			createTestFile(),
			`unauth-test-${Date.now()}.txt`,
			'text/plain',
			{ encrypt: true },
		)

		skipUnlessEncryptedUploadOk(uploadResponse)
		const media: MediaItem = await uploadResponse.json()

		// Clear token (unauthenticated)
		apiClient.setToken(null)

		const getResponse = await apiClient.getMedia(media.id)
		expect(getResponse.status()).toBe(403)
	})

	test('admin can access encrypted media owned by another user', async ({
		apiClient,
	}) => {
		// Upload as owner
		const uploadResponse = await apiClient.uploadMedia(
			createTestFile(),
			`admin-access-${Date.now()}.txt`,
			'text/plain',
			{ encrypt: true },
		)

		skipUnlessEncryptedUploadOk(uploadResponse)
		const media: MediaItem = await uploadResponse.json()

		// Log in as admin (first registered user in test env has admin role)
		try {
			const adminAuth = await apiClient.login('test@example.com', 'password123')
			apiClient.setToken(adminAuth.access_token)
		} catch {
			test.skip(true, 'Admin account not available in this environment')
			return
		}

		// Admin should have full access
		const getResponse = await apiClient.getMedia(media.id)
		expect(getResponse.ok()).toBeTruthy()
	})

	test('non-encrypted media remains accessible without auth', async ({
		apiClient,
	}) => {
		// Upload a public file
		const uploadResponse = await apiClient.uploadMedia(
			createTestFile(),
			`public-${Date.now()}.txt`,
			'text/plain',
		)

		expect(uploadResponse.ok()).toBeTruthy()
		const media: MediaItem = await uploadResponse.json()

		// Clear auth token
		apiClient.setToken(null)

		// Public file should still be accessible
		const getResponse = await apiClient.getMedia(media.id)
		expect(getResponse.ok()).toBeTruthy()
	})
})
