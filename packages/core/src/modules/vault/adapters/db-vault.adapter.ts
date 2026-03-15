import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import {
	type Model,
	VaultAdapter,
	type VaultSecretMeta,
	getModelToken,
	getRegisteredModel,
} from '@magnet-cms/common'
import { Logger } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { VaultSecret } from '../schemas/vault-secret.schema'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256-bit key
const IV_LENGTH = 16 // 128-bit IV
const AUTH_TAG_LENGTH = 16 // 128-bit GCM auth tag

/**
 * Built-in database-backed vault adapter.
 *
 * Stores secrets encrypted with AES-256-GCM in the application's own database.
 *
 * Requires the VAULT_MASTER_KEY environment variable — a 64-character hex string
 * representing 32 random bytes. If not set, the adapter starts in unconfigured mode:
 * the app boots normally but all vault operations return null / throw at call time.
 *
 * Generate a master key:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export class DbVaultAdapter extends VaultAdapter {
	private readonly logger = new Logger(DbVaultAdapter.name)
	private model: Model<VaultSecret> | null = null
	private masterKey: Buffer | null = null
	private configured = false

	constructor(private readonly moduleRef: ModuleRef) {
		super()
	}

	async initialize(): Promise<void> {
		const rawKey = process.env.VAULT_MASTER_KEY

		if (!rawKey) {
			this.logger.warn(
				'VAULT_MASTER_KEY is not set. The vault is running in unconfigured mode — ' +
					'secret operations will be unavailable. ' +
					"Generate a key with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
			)
			return
		}

		const keyBuffer = Buffer.from(rawKey, 'hex')
		if (keyBuffer.length !== KEY_LENGTH) {
			this.logger.warn(
				`VAULT_MASTER_KEY must be a ${KEY_LENGTH * 2}-character hex string (${KEY_LENGTH} bytes). ` +
					`Got ${keyBuffer.length} bytes. Vault is running in unconfigured mode.`,
			)
			return
		}

		this.masterKey = keyBuffer

		const token = getModelToken(VaultSecret.name)
		this.model =
			getRegisteredModel<Model<VaultSecret>>(token) ||
			this.moduleRef.get<Model<VaultSecret>>(token, { strict: false })
		this.configured = true

		this.logger.log('DB vault adapter initialized')
	}

	async get(key: string): Promise<string | null> {
		if (!this.configured) {
			return null
		}
		const record = await this.getModel().findOne({
			key,
		} as Partial<VaultSecret>)
		if (!record) {
			return null
		}
		return this.decrypt(record.encryptedData, record.iv, record.authTag)
	}

	async set(key: string, value: string, description?: string): Promise<void> {
		if (!this.configured) {
			throw new Error(
				'Vault is not configured. Set VAULT_MASTER_KEY to enable secret storage.',
			)
		}
		const { encryptedData, iv, authTag } = this.encrypt(value)
		const now = new Date()
		const existing = await this.getModel().findOne({
			key,
		} as Partial<VaultSecret>)

		if (existing) {
			await this.getModel().update(
				{ key } as Partial<VaultSecret>,
				{
					encryptedData,
					iv,
					authTag,
					description,
					updatedAt: now,
				} as Partial<VaultSecret>,
			)
		} else {
			await this.getModel().create({
				key,
				description,
				encryptedData,
				iv,
				authTag,
				createdAt: now,
				updatedAt: now,
			})
		}
	}

	async delete(key: string): Promise<void> {
		if (!this.configured) {
			return
		}
		await this.getModel().delete({ key } as Partial<VaultSecret>)
	}

	async list(prefix?: string): Promise<VaultSecretMeta[]> {
		if (!this.configured) {
			return []
		}
		let records: Array<{ key: string; description?: string; updatedAt?: Date }>

		if (prefix) {
			const builder = this.getModel().query()
			const results = await builder
				.where({ key: { $regex: `^${prefix}` } } as Parameters<
					typeof builder.where
				>[0])
				.exec()
			records = results as Array<{
				key: string
				description?: string
				updatedAt?: Date
			}>
		} else {
			records = await this.getModel().find()
		}

		return records.map((r) => ({
			name: r.key,
			description: r.description,
			lastUpdated: r.updatedAt?.toISOString(),
		}))
	}

	async healthCheck(): Promise<boolean> {
		if (!this.configured) {
			return false
		}
		try {
			await this.getModel().query().limit(1).exec()
			return true
		} catch {
			return false
		}
	}

	/**
	 * Whether VAULT_MASTER_KEY is present in the environment.
	 */
	static isMasterKeyConfigured(): boolean {
		return Boolean(process.env.VAULT_MASTER_KEY)
	}

	private getModel(): Model<VaultSecret> {
		if (!this.model) {
			throw new Error(
				'DbVaultAdapter not initialized. Call initialize() first.',
			)
		}
		return this.model
	}

	private getMasterKey(): Buffer {
		if (!this.masterKey) {
			throw new Error(
				'DbVaultAdapter not initialized. Call initialize() first.',
			)
		}
		return this.masterKey
	}

	private encrypt(value: string): {
		encryptedData: string
		iv: string
		authTag: string
	} {
		const iv = randomBytes(IV_LENGTH)
		const cipher = createCipheriv(ALGORITHM, this.getMasterKey(), iv, {
			authTagLength: AUTH_TAG_LENGTH,
		})

		const encrypted = Buffer.concat([
			cipher.update(value, 'utf8'),
			cipher.final(),
		])

		return {
			encryptedData: encrypted.toString('hex'),
			iv: iv.toString('hex'),
			authTag: cipher.getAuthTag().toString('hex'),
		}
	}

	private decrypt(encryptedData: string, iv: string, authTag: string): string {
		const decipher = createDecipheriv(
			ALGORITHM,
			this.getMasterKey(),
			Buffer.from(iv, 'hex'),
			{ authTagLength: AUTH_TAG_LENGTH },
		)
		decipher.setAuthTag(Buffer.from(authTag, 'hex'))

		const decrypted = Buffer.concat([
			decipher.update(Buffer.from(encryptedData, 'hex')),
			decipher.final(),
		])

		return decrypted.toString('utf8')
	}
}
