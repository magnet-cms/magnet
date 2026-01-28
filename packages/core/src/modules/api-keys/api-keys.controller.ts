import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '~/modules/auth/guards/jwt-auth.guard'
import {
	ApiKeyService,
	type ApiKeyStats,
	type CreateApiKeyResult,
} from './api-keys.service'
import { CreateApiKeyDto } from './dto/create-api-key.dto'
import { UpdateApiKeyDto } from './dto/update-api-key.dto'
import type { ApiKeyUsage } from './schemas/api-key-usage.schema'
import type { ApiKey } from './schemas/api-key.schema'

/**
 * Request with authenticated user
 */
interface AuthenticatedRequest extends Request {
	user: { id: string }
}

/**
 * API Key response (excludes sensitive fields)
 */
interface ApiKeyResponse {
	id: string
	name: string
	description?: string
	keyPrefix: string
	permissions: string[]
	allowedSchemas?: string[]
	allowedOrigins?: string[]
	allowedIps?: string[]
	expiresAt?: Date
	enabled: boolean
	rateLimit: number
	createdAt: Date
	lastUsedAt?: Date
	usageCount: number
}

/**
 * Created API key response (includes plain key once)
 */
interface CreatedApiKeyResponse extends ApiKeyResponse {
	/** The plain key - save this! It cannot be retrieved again. */
	plainKey: string
}

/**
 * Controller for managing API keys.
 *
 * All endpoints require JWT authentication - these are for managing keys,
 * not for using them. API key usage is handled by ApiKeyGuard.
 *
 * @example
 * ```bash
 * # Create a new API key
 * curl -X POST http://localhost:3000/api/api-keys \
 *   -H "Authorization: Bearer <jwt>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"name": "My Integration", "permissions": ["content.read"]}'
 *
 * # List your API keys
 * curl http://localhost:3000/api/api-keys \
 *   -H "Authorization: Bearer <jwt>"
 * ```
 */
@Controller('api/api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
	constructor(private readonly apiKeyService: ApiKeyService) {}

	/**
	 * Create a new API key
	 *
	 * IMPORTANT: The `plainKey` in the response is only shown once.
	 * Make sure to save it securely - it cannot be retrieved again.
	 */
	@Post()
	async create(
		@Body() dto: CreateApiKeyDto,
		@Req() req: AuthenticatedRequest,
	): Promise<CreatedApiKeyResponse> {
		const result = await this.apiKeyService.create(req.user.id, dto)
		return this.toCreatedResponse(result)
	}

	/**
	 * List all API keys for the current user
	 */
	@Get()
	async findAll(
		@Req() req: AuthenticatedRequest,
		@Query('includeDisabled') includeDisabled?: string,
	): Promise<ApiKeyResponse[]> {
		const keys = await this.apiKeyService.findByUser(
			req.user.id,
			includeDisabled === 'true',
		)
		return keys.map((key) => this.toResponse(key))
	}

	/**
	 * Get a specific API key by ID
	 */
	@Get(':id')
	async findOne(
		@Param('id') id: string,
		@Req() req: AuthenticatedRequest,
	): Promise<ApiKeyResponse> {
		const key = await this.apiKeyService.findById(id, req.user.id)
		return this.toResponse(key)
	}

	/**
	 * Update an API key
	 *
	 * Note: The key itself cannot be changed. To get a new key, use the rotate endpoint.
	 */
	@Put(':id')
	async update(
		@Param('id') id: string,
		@Body() dto: UpdateApiKeyDto,
		@Req() req: AuthenticatedRequest,
	): Promise<ApiKeyResponse> {
		const key = await this.apiKeyService.update(id, req.user.id, dto)
		return this.toResponse(key)
	}

	/**
	 * Delete an API key
	 */
	@Delete(':id')
	async delete(
		@Param('id') id: string,
		@Req() req: AuthenticatedRequest,
	): Promise<{ message: string }> {
		await this.apiKeyService.delete(id, req.user.id)
		return { message: 'API key deleted successfully' }
	}

	/**
	 * Rotate an API key
	 *
	 * Creates a new key with the same settings and disables the old one.
	 * The new `plainKey` is only shown once.
	 */
	@Post(':id/rotate')
	async rotate(
		@Param('id') id: string,
		@Req() req: AuthenticatedRequest,
	): Promise<CreatedApiKeyResponse> {
		const result = await this.apiKeyService.rotate(id, req.user.id)
		return this.toCreatedResponse(result)
	}

	/**
	 * Revoke an API key
	 *
	 * Unlike delete, this keeps the key record but marks it as disabled.
	 */
	@Post(':id/revoke')
	async revoke(
		@Param('id') id: string,
		@Body() body: { reason?: string },
		@Req() req: AuthenticatedRequest,
	): Promise<{ message: string }> {
		await this.apiKeyService.revoke(id, req.user.id, body.reason)
		return { message: 'API key revoked successfully' }
	}

	/**
	 * Get usage statistics for an API key
	 */
	@Get(':id/usage')
	async getUsageStats(
		@Param('id') id: string,
		@Query('days') days: string | undefined,
		@Req() req: AuthenticatedRequest,
	): Promise<ApiKeyStats> {
		// Verify ownership
		await this.apiKeyService.findById(id, req.user.id)
		return this.apiKeyService.getUsageStats(
			id,
			days ? Number.parseInt(days, 10) : 7,
		)
	}

	/**
	 * Get usage history for an API key
	 */
	@Get(':id/usage/history')
	async getUsageHistory(
		@Param('id') id: string,
		@Query('limit') limit: string | undefined,
		@Query('offset') offset: string | undefined,
		@Req() req: AuthenticatedRequest,
	): Promise<ApiKeyUsage[]> {
		// Verify ownership
		await this.apiKeyService.findById(id, req.user.id)
		return this.apiKeyService.getUsageHistory(
			id,
			limit ? Number.parseInt(limit, 10) : 100,
			offset ? Number.parseInt(offset, 10) : 0,
		)
	}

	// ============================================================================
	// Response Transformers
	// ============================================================================

	/**
	 * Transform API key to response (excludes sensitive fields)
	 */
	private toResponse(key: ApiKey): ApiKeyResponse {
		return {
			id: key.id,
			name: key.name,
			description: key.description,
			keyPrefix: key.keyPrefix,
			permissions: key.permissions,
			allowedSchemas: key.allowedSchemas,
			allowedOrigins: key.allowedOrigins,
			allowedIps: key.allowedIps,
			expiresAt: key.expiresAt,
			enabled: key.enabled,
			rateLimit: key.rateLimit,
			createdAt: key.createdAt,
			lastUsedAt: key.lastUsedAt,
			usageCount: key.usageCount,
		}
	}

	/**
	 * Transform created API key to response (includes plain key)
	 */
	private toCreatedResponse(result: CreateApiKeyResult): CreatedApiKeyResponse {
		return {
			...this.toResponse(result.key),
			plainKey: result.plainKey,
		}
	}
}
