import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

import { Injectable, InternalServerErrorException } from '@nestjs/common'

import { VaultService } from '~/modules/vault/vault.service'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256-bit key
const IV_LENGTH = 16 // 128-bit IV
const AUTH_TAG_LENGTH = 16 // 128-bit GCM auth tag

const VAULT_KEY_PREFIX = 'media-key'

/**
 * Service for encrypting and decrypting media file buffers.
 *
 * Manages per-user AES-256-GCM encryption keys stored in the vault.
 * Each user gets a unique random 256-bit key generated on first use
 * and stored under `media-key/{userId}` in the configured vault adapter.
 *
 * @example
 * ```typescript
 * const { encrypted, iv, authTag } = await mediaEncryptionService.encrypt(buffer, userId)
 * // Store encrypted buffer + iv + authTag in media record
 *
 * const decrypted = await mediaEncryptionService.decrypt(encrypted, userId, iv, authTag)
 * // Returns original plaintext buffer
 * ```
 */
@Injectable()
export class MediaEncryptionService {
  constructor(private readonly vaultService: VaultService) {}

  /**
   * Encrypt a file buffer using the user's AES-256-GCM key from the vault.
   * Generates a new random IV for each encryption operation.
   *
   * @param buffer - Plaintext file buffer
   * @param userId - Owner user ID (used to retrieve/create encryption key)
   * @returns Encrypted buffer with IV and auth tag for storage
   */
  async encrypt(
    buffer: Buffer,
    userId: string,
  ): Promise<{ encrypted: Buffer; iv: string; authTag: string }> {
    const key = await this.getOrCreateKey(userId)

    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    })

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()])

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
    }
  }

  /**
   * Decrypt an encrypted file buffer using the user's AES-256-GCM key from the vault.
   *
   * @param buffer - Encrypted file buffer
   * @param userId - Owner user ID (used to retrieve decryption key)
   * @param iv - Hex-encoded IV used during encryption
   * @param authTag - Hex-encoded GCM auth tag used during encryption
   * @returns Decrypted plaintext buffer
   */
  async decrypt(buffer: Buffer, userId: string, iv: string, authTag: string): Promise<Buffer> {
    const key = await this.getOrCreateKey(userId)

    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'), {
      authTagLength: AUTH_TAG_LENGTH,
    })
    decipher.setAuthTag(Buffer.from(authTag, 'hex'))

    return Buffer.concat([decipher.update(buffer), decipher.final()])
  }

  /**
   * Retrieve the user's encryption key from the vault, creating one if it doesn't exist.
   * Key is stored as a hex-encoded 32-byte (256-bit) string.
   */
  private async getOrCreateKey(userId: string): Promise<Buffer> {
    const vaultKey = `${VAULT_KEY_PREFIX}/${userId}`

    const existing = await this.vaultService.get(vaultKey).catch(() => {
      throw new InternalServerErrorException(
        'Encryption unavailable — vault not configured or unreachable',
      )
    })

    if (existing) {
      return Buffer.from(existing, 'hex')
    }

    // Generate and store a new random 256-bit key
    const newKey = randomBytes(KEY_LENGTH)
    await this.vaultService
      .set(vaultKey, newKey.toString('hex'), `Media encryption key for user ${userId}`)
      .catch(() => {
        throw new InternalServerErrorException(
          'Failed to store encryption key — vault not configured or unreachable',
        )
      })

    return newKey
  }
}
