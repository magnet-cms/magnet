import { createHash, randomBytes } from 'node:crypto'
import { InjectModel, Model, ResourceNotFoundError } from '@magnet-cms/common'
import { Injectable, Logger } from '@nestjs/common'
import { EventService } from '~/modules/events'
import { SettingsService } from '~/modules/settings'
import { ApiKeySettings } from './api-keys.settings'
import { CreateApiKeyDto } from './dto/create-api-key.dto'
import { LogUsageDto } from './dto/log-usage.dto'
import { UpdateApiKeyDto } from './dto/update-api-key.dto'
import { ApiKeyUsage } from './schemas/api-key-usage.schema'
import { ApiKey } from './schemas/api-key.schema'

/**
 * Result of creating an API key
 */
export interface CreateApiKeyResult {
	/** The created API key record (without the plain key) */
	key: ApiKey
	/** The plain key - only shown once! */
	plainKey: string
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
	/** Whether the request is allowed */
	allowed: boolean
	/** Remaining requests in the current window */
	remaining: number
	/** When the rate limit resets */
	resetAt: Date
}

/**
 * API key usage statistics
 */
export interface ApiKeyStats {
	/** Total number of requests */
	totalRequests: number
	/** Number of successful requests (status < 400) */
	successCount: number
	/** Number of failed requests (status >= 400) */
	errorCount: number
	/** Success rate percentage */
	successRate: number
	/** Average response time in milliseconds */
	avgResponseTime: number
}

/**
 * API Key service for managing programmatic access to the CMS.
 *
 * Provides secure API key generation, validation, rate limiting,
 * and usage tracking for external integrations.
 *
 * @example
 * ```typescript
 * // Creating a key
 * const { key, plainKey } = await apiKeyService.create(userId, {
 *   name: 'My Integration',
 *   permissions: ['content.read'],
 * })
 * console.log('Save this key - it cannot be retrieved again:', plainKey)
 *
 * // Validating a key
 * const apiKey = await apiKeyService.validate(providedKey)
 * if (apiKey && apiKeyService.hasPermission(apiKey, 'content.read')) {
 *   // Allow access
 * }
 * ```
 */
@Injectable()
export class ApiKeyService {
	private readonly logger = new Logger(ApiKeyService.name)
	private readonly KEY_PREFIX = 'mgnt_'

	constructor(
		@InjectModel(ApiKey) private readonly apiKeyModel: Model<ApiKey>,
		@InjectModel(ApiKeyUsage)
		private readonly usageModel: Model<ApiKeyUsage>,
		private readonly eventService: EventService,
		private readonly settingsService: SettingsService,
	) {}

	// ============================================================================
	// Core Operations
	// ============================================================================

	/**
	 * Create a new API key
	 *
	 * IMPORTANT: The plainKey is only returned once and cannot be retrieved again.
	 * The caller must save it securely.
	 *
	 * @param userId - Owner of the key
	 * @param dto - Key creation options
	 * @returns The created key and the plain key (shown only once)
	 */
	async create(
		userId: string,
		dto: CreateApiKeyDto,
	): Promise<CreateApiKeyResult> {
		const settings = await this.settingsService.get(ApiKeySettings)

		// Check max keys per user
		const existingKeys = await this.apiKeyModel.findMany({
			userId,
			enabled: true,
		})
		if (existingKeys.length >= settings.maxKeysPerUser) {
			throw new Error(
				`Maximum API keys per user (${settings.maxKeysPerUser}) reached`,
			)
		}

		// Generate secure key
		const plainKey = this.generateKey()
		const keyHash = this.hashKey(plainKey)
		const keyPrefix = plainKey.substring(0, 12)

		// Create key record
		const key = await this.apiKeyModel.create({
			name: dto.name,
			description: dto.description,
			keyHash,
			keyPrefix,
			userId,
			permissions: dto.permissions ?? ['*'],
			allowedSchemas: dto.allowedSchemas,
			allowedOrigins: dto.allowedOrigins,
			allowedIps: dto.allowedIps,
			expiresAt: dto.expiresAt,
			rateLimit: dto.rateLimit ?? settings.defaultRateLimit,
			enabled: true,
			createdAt: new Date(),
			usageCount: 0,
		})

		// Emit event
		await this.emitEvent('api_key.created', {
			apiKeyId: key.id,
			name: dto.name,
		})

		this.logger.log(`Created API key "${dto.name}" for user ${userId}`)

		return { key, plainKey }
	}

	/**
	 * Validate an API key
	 *
	 * @param plainKey - The plain text API key
	 * @returns The API key record if valid, null otherwise
	 */
	async validate(plainKey: string): Promise<ApiKey | null> {
		// Check prefix
		if (!plainKey.startsWith(this.KEY_PREFIX)) {
			return null
		}

		// Look up by hash
		const keyHash = this.hashKey(plainKey)
		const key = await this.apiKeyModel.findOne({ keyHash, enabled: true })

		if (!key) {
			return null
		}

		// Check expiration
		if (key.expiresAt && key.expiresAt < new Date()) {
			this.logger.debug(`API key ${key.keyPrefix} has expired`)
			return null
		}

		// Update usage stats (fire and forget)
		this.apiKeyModel
			.update(
				{ keyHash },
				{
					lastUsedAt: new Date(),
					usageCount: key.usageCount + 1,
				},
			)
			.catch((err) => {
				this.logger.warn(`Failed to update API key usage: ${err}`)
			})

		return key
	}

	/**
	 * Check if a key has a specific permission
	 *
	 * @param key - The API key record
	 * @param permission - The permission to check (e.g., 'content.read')
	 * @returns True if the key has the permission
	 */
	hasPermission(key: ApiKey, permission: string): boolean {
		// Full access
		if (key.permissions.includes('*')) {
			return true
		}

		// Exact match
		if (key.permissions.includes(permission)) {
			return true
		}

		// Wildcard match (e.g., 'content.*' matches 'content.read')
		const [resource] = permission.split('.')
		if (resource && key.permissions.includes(`${resource}.*`)) {
			return true
		}

		return false
	}

	/**
	 * Check if a key has access to a specific schema
	 *
	 * @param key - The API key record
	 * @param schemaName - The schema name to check
	 * @returns True if the key has access to the schema
	 */
	hasSchemaAccess(key: ApiKey, schemaName: string): boolean {
		// No restrictions = all schemas allowed
		if (!key.allowedSchemas || key.allowedSchemas.length === 0) {
			return true
		}

		return key.allowedSchemas.includes(schemaName)
	}

	/**
	 * Check if a key's IP is allowed
	 *
	 * @param key - The API key record
	 * @param ipAddress - The client IP address
	 * @returns True if the IP is allowed
	 */
	isIpAllowed(key: ApiKey, ipAddress: string): boolean {
		// No restrictions = all IPs allowed
		if (!key.allowedIps || key.allowedIps.length === 0) {
			return true
		}

		return key.allowedIps.includes(ipAddress)
	}

	// ============================================================================
	// Rate Limiting
	// ============================================================================

	/**
	 * Check rate limit for an API key
	 *
	 * @param key - The API key record
	 * @returns Rate limit status
	 */
	async checkRateLimit(key: ApiKey): Promise<RateLimitResult> {
		// Get start of current hour
		const windowStart = new Date()
		windowStart.setMinutes(0, 0, 0)

		// Count requests in current window
		const usageRecords = await this.usageModel.findMany({ keyId: key.id })
		const usageCount = usageRecords.filter(
			(u) => u.timestamp >= windowStart,
		).length

		const remaining = Math.max(0, key.rateLimit - usageCount)
		const resetAt = new Date(windowStart.getTime() + 3600000) // Next hour

		return {
			allowed: usageCount < key.rateLimit,
			remaining,
			resetAt,
		}
	}

	// ============================================================================
	// Usage Tracking
	// ============================================================================

	/**
	 * Log API key usage
	 *
	 * @param keyId - The API key ID
	 * @param data - Usage data to log
	 */
	async logUsage(keyId: string, data: LogUsageDto): Promise<void> {
		await this.usageModel.create({
			keyId,
			endpoint: data.endpoint,
			method: data.method,
			statusCode: data.statusCode,
			responseTime: data.responseTime,
			ipAddress: data.ipAddress,
			userAgent: data.userAgent,
			error: data.error,
			schema: data.schema,
			timestamp: new Date(),
		})
	}

	/**
	 * Get usage statistics for an API key
	 *
	 * @param keyId - The API key ID
	 * @param days - Number of days to include (default 7)
	 * @returns Usage statistics
	 */
	async getUsageStats(keyId: string, days = 7): Promise<ApiKeyStats> {
		const since = new Date()
		since.setDate(since.getDate() - days)

		const usageRecords = await this.usageModel.findMany({ keyId })
		const filteredRecords = usageRecords.filter((u) => u.timestamp >= since)

		const totalRequests = filteredRecords.length
		const successCount = filteredRecords.filter(
			(u) => u.statusCode !== undefined && u.statusCode < 400,
		).length
		const errorCount = filteredRecords.filter(
			(u) => u.statusCode !== undefined && u.statusCode >= 400,
		).length

		const responseTimes = filteredRecords
			.filter((u) => u.responseTime !== undefined)
			.map((u) => u.responseTime as number)

		const avgResponseTime =
			responseTimes.length > 0
				? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
				: 0

		return {
			totalRequests,
			successCount,
			errorCount,
			successRate: totalRequests > 0 ? (successCount / totalRequests) * 100 : 0,
			avgResponseTime,
		}
	}

	/**
	 * Get usage history for an API key
	 *
	 * @param keyId - The API key ID
	 * @param limit - Maximum records to return
	 * @param offset - Number of records to skip
	 * @returns Usage history records
	 */
	async getUsageHistory(
		keyId: string,
		limit = 100,
		offset = 0,
	): Promise<ApiKeyUsage[]> {
		const records = await this.usageModel.findMany({ keyId })
		// Sort by timestamp descending
		records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
		return records.slice(offset, offset + limit)
	}

	// ============================================================================
	// Key Management
	// ============================================================================

	/**
	 * Rotate an API key (invalidate old, create new)
	 *
	 * @param keyId - The key to rotate
	 * @param userId - User performing the rotation (for authorization)
	 * @returns New key information
	 */
	async rotate(keyId: string, userId: string): Promise<CreateApiKeyResult> {
		const oldKey = await this.findById(keyId, userId)

		// Create new key with same settings
		const result = await this.create(userId, {
			name: `${oldKey.name} (rotated)`,
			description: oldKey.description,
			permissions: oldKey.permissions,
			allowedSchemas: oldKey.allowedSchemas,
			allowedOrigins: oldKey.allowedOrigins,
			allowedIps: oldKey.allowedIps,
			expiresAt: oldKey.expiresAt,
			rateLimit: oldKey.rateLimit,
		})

		// Disable old key
		await this.apiKeyModel.update(
			{ id: keyId },
			{
				enabled: false,
				revokedAt: new Date(),
				revokedReason: 'Key rotation',
			},
		)

		this.logger.log(
			`Rotated API key ${oldKey.keyPrefix} -> ${result.key.keyPrefix}`,
		)

		return result
	}

	/**
	 * Revoke an API key
	 *
	 * @param keyId - The key to revoke
	 * @param userId - User performing the revocation
	 * @param reason - Reason for revocation
	 */
	async revoke(keyId: string, userId: string, reason?: string): Promise<void> {
		const key = await this.findById(keyId, userId)

		await this.apiKeyModel.update(
			{ id: keyId },
			{
				enabled: false,
				revokedAt: new Date(),
				revokedReason: reason ?? 'Manual revocation',
			},
		)

		// Emit event
		await this.emitEvent('api_key.revoked', {
			apiKeyId: key.id,
			name: key.name,
			reason,
		})

		this.logger.log(`Revoked API key ${key.keyPrefix}`)
	}

	// ============================================================================
	// CRUD Operations
	// ============================================================================

	/**
	 * Find all API keys for a user
	 *
	 * @param userId - The user's ID
	 * @param includeDisabled - Whether to include disabled keys
	 * @returns List of API keys (without sensitive fields)
	 */
	async findByUser(userId: string, includeDisabled = false): Promise<ApiKey[]> {
		const query = includeDisabled ? { userId } : { userId, enabled: true }
		return this.apiKeyModel.findMany(query)
	}

	/**
	 * Find an API key by ID
	 *
	 * @param id - The key ID
	 * @param userId - User ID for authorization check
	 * @returns The API key
	 * @throws ResourceNotFoundError if not found or not authorized
	 */
	async findById(id: string, userId: string): Promise<ApiKey> {
		const key = await this.apiKeyModel.findOne({ id })

		if (!key) {
			throw new ResourceNotFoundError('ApiKey', id)
		}

		// Authorization check
		if (key.userId !== userId) {
			throw new ResourceNotFoundError('ApiKey', id)
		}

		return key
	}

	/**
	 * Update an API key
	 *
	 * @param id - The key ID
	 * @param userId - User ID for authorization
	 * @param dto - Update data
	 * @returns Updated API key
	 */
	async update(
		id: string,
		userId: string,
		dto: UpdateApiKeyDto,
	): Promise<ApiKey> {
		// Verify ownership
		await this.findById(id, userId)

		await this.apiKeyModel.update({ id }, dto)

		const updated = await this.findById(id, userId)
		this.logger.log(`Updated API key ${updated.keyPrefix}`)

		return updated
	}

	/**
	 * Delete an API key
	 *
	 * @param id - The key ID
	 * @param userId - User ID for authorization
	 */
	async delete(id: string, userId: string): Promise<void> {
		const key = await this.findById(id, userId)

		await this.apiKeyModel.delete({ id })

		this.logger.log(`Deleted API key ${key.keyPrefix}`)
	}

	// ============================================================================
	// Maintenance
	// ============================================================================

	/**
	 * Clean up old usage records
	 *
	 * Should be run periodically via a cron job.
	 *
	 * @param retentionDays - Number of days to retain
	 * @returns Number of records deleted
	 */
	async cleanupUsageRecords(retentionDays?: number): Promise<number> {
		const settings = await this.settingsService.get(ApiKeySettings)
		const cutoff = new Date()
		cutoff.setDate(
			cutoff.getDate() - (retentionDays ?? settings.usageRetentionDays),
		)

		const records = await this.usageModel.findMany({})
		const oldRecords = records.filter((r) => r.timestamp < cutoff)

		for (const record of oldRecords) {
			await this.usageModel.delete({ id: record.id })
		}

		if (oldRecords.length > 0) {
			this.logger.log(`Cleaned up ${oldRecords.length} old usage records`)
		}

		return oldRecords.length
	}

	// ============================================================================
	// Private Helpers
	// ============================================================================

	/**
	 * Generate a secure API key
	 */
	private generateKey(): string {
		const randomPart = randomBytes(32).toString('base64url')
		return `${this.KEY_PREFIX}${randomPart}`
	}

	/**
	 * Hash a key for storage
	 */
	private hashKey(plainKey: string): string {
		return createHash('sha256').update(plainKey).digest('hex')
	}

	/**
	 * Emit an API key event
	 */
	private async emitEvent(
		event: 'api_key.created' | 'api_key.revoked' | 'api_key.used',
		payload: {
			apiKeyId: string
			name: string
			reason?: string
			endpoint?: string
		},
	): Promise<void> {
		try {
			await this.eventService.emit(event, payload)
		} catch (error) {
			// Don't fail operations due to event emission errors
			this.logger.warn(`Failed to emit event ${event}:`, error)
		}
	}
}
