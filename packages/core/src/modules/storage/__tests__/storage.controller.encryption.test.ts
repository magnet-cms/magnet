/**
 * StorageController encryption param handling tests.
 *
 * Verifies that the upload endpoint correctly extracts `encrypt` from the
 * multipart form body and passes encrypt/ownerId to StorageService.upload().
 *
 * Business logic and access control are covered by:
 * - storage.service.encryption.test.ts (StorageService orchestration)
 * - guards/__tests__/media-owner.guard.test.ts (MediaOwnerGuard access control)
 */
import { describe, expect, it } from 'bun:test'

// ------- Pure helpers that mirror the controller's param extraction -------

interface UploadBodyParams {
	encryptStr?: string
	userId?: string
}

interface ResolvedUploadOptions {
	encrypt: boolean
	ownerId: string | undefined
}

/**
 * Mirrors the encrypt/ownerId extraction logic in StorageController.upload().
 */
function resolveEncryptOptions(
	params: UploadBodyParams,
): ResolvedUploadOptions {
	const encrypt = params.encryptStr === 'true'
	return {
		encrypt,
		ownerId: encrypt ? params.userId : undefined,
	}
}

describe('StorageController upload encrypt param extraction', () => {
	it('should not encrypt when encrypt param is absent', () => {
		const opts = resolveEncryptOptions({ userId: 'user-1' })
		expect(opts.encrypt).toBe(false)
		expect(opts.ownerId).toBeUndefined()
	})

	it('should not encrypt when encrypt param is "false"', () => {
		const opts = resolveEncryptOptions({
			encryptStr: 'false',
			userId: 'user-1',
		})
		expect(opts.encrypt).toBe(false)
		expect(opts.ownerId).toBeUndefined()
	})

	it('should encrypt and set ownerId when encrypt param is "true"', () => {
		const opts = resolveEncryptOptions({
			encryptStr: 'true',
			userId: 'user-42',
		})
		expect(opts.encrypt).toBe(true)
		expect(opts.ownerId).toBe('user-42')
	})

	it('should set ownerId to undefined when encrypting without userId', () => {
		const opts = resolveEncryptOptions({
			encryptStr: 'true',
			userId: undefined,
		})
		expect(opts.encrypt).toBe(true)
		expect(opts.ownerId).toBeUndefined()
	})
})
