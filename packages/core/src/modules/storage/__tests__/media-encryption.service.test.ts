import { InternalServerErrorException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MediaEncryptionService } from '../media-encryption.service'

const mockVaultGet = vi.fn(async (_key: string) => null as string | null)
const mockVaultSet = vi.fn(async () => {})

const mockVaultService = {
  get: mockVaultGet,
  set: mockVaultSet,
}

describe('MediaEncryptionService', () => {
  let service: MediaEncryptionService

  beforeEach(() => {
    mockVaultGet.mockReset()
    mockVaultGet.mockResolvedValue(null)
    mockVaultSet.mockReset()
    mockVaultSet.mockResolvedValue(undefined)
    service = new MediaEncryptionService(mockVaultService as never)
  })

  describe('encrypt()', () => {
    it('should return encrypted buffer with iv and authTag', async () => {
      const buffer = Buffer.from('hello world')
      const userId = 'user-123'

      const result = await service.encrypt(buffer, userId)

      expect(result.encrypted).toBeInstanceOf(Buffer)
      expect(typeof result.iv).toBe('string')
      expect(typeof result.authTag).toBe('string')
      expect(result.iv).toHaveLength(32) // 16 bytes hex
      expect(result.authTag).toHaveLength(32) // 16 bytes hex
    })

    it('should produce different ciphertext for same plaintext (random IV)', async () => {
      const buffer = Buffer.from('same content')
      const userId = 'user-123'
      // set up a fixed key so only IV varies
      const fixedKey = Buffer.alloc(32, 0xff).toString('hex')
      mockVaultGet.mockResolvedValue(fixedKey)

      const result1 = await service.encrypt(buffer, userId)
      const result2 = await service.encrypt(buffer, userId)

      expect(result1.iv).not.toBe(result2.iv)
      expect(result1.encrypted.toString('hex')).not.toBe(result2.encrypted.toString('hex'))
    })

    it('should store new vault key when none exists', async () => {
      mockVaultGet.mockResolvedValue(null)
      const buffer = Buffer.from('data')
      const userId = 'new-user'

      await service.encrypt(buffer, userId)

      expect(mockVaultSet).toHaveBeenCalledWith(
        'media-key/new-user',
        expect.any(String),
        expect.stringContaining('new-user'),
      )
    })

    it('should use existing vault key when available', async () => {
      const existingKey = Buffer.alloc(32, 0xab).toString('hex')
      mockVaultGet.mockResolvedValue(existingKey)

      await service.encrypt(Buffer.from('data'), 'user-123')

      expect(mockVaultSet).not.toHaveBeenCalled()
    })

    it('should throw InternalServerErrorException when vault is unavailable', async () => {
      mockVaultGet.mockRejectedValue(new Error('vault unreachable'))

      await expect(service.encrypt(Buffer.from('data'), 'user-123')).rejects.toBeInstanceOf(
        InternalServerErrorException,
      )
    })
  })

  describe('decrypt()', () => {
    it('should decrypt an encrypted buffer back to original', async () => {
      const original = Buffer.from('secret file content')
      const userId = 'user-123'

      const { encrypted, iv, authTag } = await service.encrypt(original, userId)
      // At this point mockVaultSet was called with the new key; mock get to return it
      const storedKey = (mockVaultSet.mock.calls[0] as string[])[1]
      mockVaultGet.mockResolvedValue(storedKey)

      const decrypted = await service.decrypt(encrypted, userId, iv, authTag)

      expect(decrypted).toEqual(original)
    })

    it('should throw when vault key retrieval fails on decrypt', async () => {
      mockVaultGet.mockRejectedValue(new Error('vault down'))

      await expect(
        service.decrypt(Buffer.from('data'), 'user-123', 'aabbcc', 'ddeeff'),
      ).rejects.toBeInstanceOf(InternalServerErrorException)
    })
  })

  describe('encrypt → decrypt roundtrip', () => {
    it('should preserve binary file content through encrypt/decrypt cycle', async () => {
      // Simulate a PDF file (binary content)
      const original = Buffer.from([
        0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0xff, 0xfe, 0x00,
      ])
      const userId = 'user-pdf'

      const { encrypted, iv, authTag } = await service.encrypt(original, userId)
      const storedKey = (mockVaultSet.mock.calls[0] as string[])[1]
      mockVaultGet.mockResolvedValue(storedKey)

      const decrypted = await service.decrypt(encrypted, userId, iv, authTag)

      expect(decrypted.toString('hex')).toBe(original.toString('hex'))
    })

    it('should use vault key prefix media-key/{userId}', async () => {
      const userId = 'trip-user-42'
      await service.encrypt(Buffer.from('data'), userId)

      expect(mockVaultGet).toHaveBeenCalledWith(`media-key/${userId}`)
    })
  })
})
