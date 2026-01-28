import { Field, Schema } from '@magnet-cms/common'
import {
	IsArray,
	IsBoolean,
	IsDate,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Min,
} from 'class-validator'

/**
 * Permission scope for API keys
 */
export type ApiKeyPermissionScope =
	| '*'
	| 'content.*'
	| 'content.read'
	| 'content.write'
	| 'content.delete'
	| 'content.publish'
	| 'media.*'
	| 'media.read'
	| 'media.upload'
	| 'media.delete'
	| 'users.read'
	| 'users.write'
	| 'settings.read'
	| 'settings.write'

/**
 * API Key schema for programmatic access to the CMS.
 *
 * API keys provide scoped, rate-limited access for external integrations.
 * The actual key is only shown once upon creation - only the hash is stored.
 *
 * @example
 * ```typescript
 * // Creating an API key
 * const { key, plainKey } = await apiKeyService.create(userId, {
 *   name: 'My Integration',
 *   permissions: ['content.read', 'content.write'],
 *   rateLimit: 500,
 * })
 *
 * // Using the key
 * curl -H "Authorization: Bearer mgnt_..." https://api.example.com/content/posts
 * ```
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class ApiKey {
	/**
	 * Document ID (assigned by database)
	 */
	id!: string

	/**
	 * Human-readable name for the key
	 */
	@Field.Text({ required: true })
	@Field.Validators(IsString(), IsNotEmpty())
	name!: string

	/**
	 * Optional description of what this key is used for
	 */
	@Field.Textarea({})
	@Field.Validators(IsString(), IsOptional())
	description?: string

	/**
	 * SHA-256 hash of the key (never store plain key)
	 */
	@Field.Text({ required: true, unique: true, hidden: true })
	@Field.Validators(IsString(), IsNotEmpty())
	keyHash!: string

	/**
	 * First 12 characters of key for identification (e.g., "mgnt_abc12345")
	 */
	@Field.Text({ required: true })
	@Field.Validators(IsString(), IsNotEmpty())
	keyPrefix!: string

	/**
	 * User ID who owns this key
	 */
	@Field.Text({ required: true })
	@Field.Validators(IsString(), IsNotEmpty())
	userId!: string

	/**
	 * Permission scopes granted to this key
	 * Use '*' for full access, or specific scopes like 'content.read'
	 */
	@Field.Tags({ default: ['*'] })
	@Field.Validators(IsArray(), IsString({ each: true }))
	permissions: string[] = ['*']

	/**
	 * Restrict key to specific content schemas (empty = all)
	 */
	@Field.Tags({})
	@Field.Validators(IsArray(), IsString({ each: true }), IsOptional())
	allowedSchemas?: string[]

	/**
	 * Allowed CORS origins for this key
	 */
	@Field.Tags({})
	@Field.Validators(IsArray(), IsString({ each: true }), IsOptional())
	allowedOrigins?: string[]

	/**
	 * IP whitelist (empty = allow all)
	 */
	@Field.Tags({})
	@Field.Validators(IsArray(), IsString({ each: true }), IsOptional())
	allowedIps?: string[]

	/**
	 * Optional expiration date for the key
	 */
	@Field.DateTime({})
	@Field.Validators(IsDate(), IsOptional())
	expiresAt?: Date

	/**
	 * Whether the key is active
	 */
	@Field.Boolean({ default: true })
	@Field.Validators(IsBoolean())
	enabled = true

	/**
	 * Rate limit: requests per hour
	 */
	@Field.Number({ default: 1000 })
	@Field.Validators(IsNumber(), Min(1))
	rateLimit = 1000

	/**
	 * When the key was created
	 */
	@Field.DateTime({ default: () => new Date() })
	@Field.Validators(IsDate())
	createdAt: Date = new Date()

	/**
	 * When the key was last used
	 */
	@Field.DateTime({})
	@Field.Validators(IsDate(), IsOptional())
	lastUsedAt?: Date

	/**
	 * Total number of times the key has been used
	 */
	@Field.Number({ default: 0 })
	@Field.Validators(IsNumber(), Min(0))
	usageCount = 0

	/**
	 * When the key was revoked (if applicable)
	 */
	@Field.DateTime({})
	@Field.Validators(IsDate(), IsOptional())
	revokedAt?: Date

	/**
	 * Reason for revocation
	 */
	@Field.Text({})
	@Field.Validators(IsString(), IsOptional())
	revokedReason?: string
}
