import { Field, Schema } from '@magnet-cms/common'

/**
 * Schema for encrypted vault secrets stored in the app database.
 * Each row holds one secret entry encrypted with AES-256-GCM.
 * The plaintext is never stored — only the ciphertext, IV, and auth tag.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class VaultSecret {
  /** Unique key identifying this secret (e.g., 'database', 'sendgrid') */
  @Field.Text({ required: true, unique: true })
  key!: string

  /** Optional human-readable description (stored unencrypted) */
  @Field.Text({ required: false })
  description?: string

  /** AES-256-GCM encrypted string value (hex) */
  @Field.Text({ required: true })
  encryptedData!: string

  /** Initialization vector used for encryption (hex string) */
  @Field.Text({ required: true })
  iv!: string

  /** GCM authentication tag for integrity verification (hex string) */
  @Field.Text({ required: true })
  authTag!: string

  @Field.Date({ default: () => new Date() })
  createdAt!: Date

  @Field.Date({ default: () => new Date() })
  updatedAt!: Date
}
