import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	HttpException,
	Injectable,
	Logger,
	UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request, Response } from 'express'
import { ApiKeyService } from '../api-keys.service'
import {
	API_KEY_PERMISSION_KEY,
	API_KEY_SCHEMA_KEY,
} from '../decorators/api-key.decorator'
import type { ApiKey } from '../schemas/api-key.schema'

/**
 * Extended request interface with API key information
 */
export interface ApiKeyRequest extends Request {
	/** The validated API key record */
	apiKey?: ApiKey
	/** User information derived from the API key */
	user?: { id: string }
}

/**
 * Guard for API key authentication.
 *
 * This guard validates API keys, checks permissions, enforces rate limits,
 * and attaches the key information to the request.
 *
 * @example
 * ```typescript
 * @Controller('api/content')
 * @UseGuards(ApiKeyGuard)
 * export class ContentApiController {
 *   @Get()
 *   @RequireApiKeyPermission('content.read')
 *   async list() { ... }
 * }
 * ```
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
	private readonly logger = new Logger(ApiKeyGuard.name)

	constructor(
		private readonly apiKeyService: ApiKeyService,
		private readonly reflector: Reflector,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<ApiKeyRequest>()
		const response = context.switchToHttp().getResponse<Response>()

		// Extract API key from request
		const apiKey = this.extractApiKey(request)
		if (!apiKey) {
			throw new UnauthorizedException('API key required')
		}

		// Validate key
		const key = await this.apiKeyService.validate(apiKey)
		if (!key) {
			throw new UnauthorizedException('Invalid or expired API key')
		}

		// Check IP whitelist
		const clientIp = this.getClientIp(request)
		if (!this.apiKeyService.isIpAllowed(key, clientIp)) {
			this.logger.warn(
				`API key ${key.keyPrefix} denied: IP ${clientIp} not allowed`,
			)
			throw new ForbiddenException('IP address not allowed')
		}

		// Check rate limit
		const rateLimit = await this.apiKeyService.checkRateLimit(key)
		this.setRateLimitHeaders(
			response,
			key.rateLimit,
			rateLimit.remaining,
			rateLimit.resetAt,
		)

		if (!rateLimit.allowed) {
			throw new HttpException(
				{
					statusCode: 429,
					message: 'Rate limit exceeded',
					error: 'Too Many Requests',
				},
				429,
			)
		}

		// Check required permission
		const requiredPermission = this.reflector.get<string>(
			API_KEY_PERMISSION_KEY,
			context.getHandler(),
		)
		if (
			requiredPermission &&
			!this.apiKeyService.hasPermission(key, requiredPermission)
		) {
			this.logger.warn(
				`API key ${key.keyPrefix} denied: missing permission ${requiredPermission}`,
			)
			throw new ForbiddenException(
				`Insufficient permissions: ${requiredPermission} required`,
			)
		}

		// Check required schema access
		const requiredSchema = this.reflector.get<string>(
			API_KEY_SCHEMA_KEY,
			context.getHandler(),
		)
		if (
			requiredSchema &&
			!this.apiKeyService.hasSchemaAccess(key, requiredSchema)
		) {
			this.logger.warn(
				`API key ${key.keyPrefix} denied: no access to schema ${requiredSchema}`,
			)
			throw new ForbiddenException(`No access to schema: ${requiredSchema}`)
		}

		// Attach key to request
		request.apiKey = key
		request.user = { id: key.userId }

		return true
	}

	/**
	 * Extract API key from request headers
	 *
	 * Supports:
	 * - Authorization: Bearer mgnt_...
	 * - X-API-Key: mgnt_...
	 */
	private extractApiKey(request: Request): string | null {
		// Check Authorization header
		const authHeader = request.headers.authorization
		if (authHeader?.startsWith('Bearer ')) {
			const token = authHeader.slice(7)
			if (token.startsWith('mgnt_')) {
				return token
			}
		}

		// Check X-API-Key header
		const apiKeyHeader = request.headers['x-api-key']
		if (typeof apiKeyHeader === 'string') {
			return apiKeyHeader
		}

		return null
	}

	/**
	 * Get client IP address from request
	 */
	private getClientIp(request: Request): string {
		// Check common proxy headers
		const forwarded = request.headers['x-forwarded-for']
		if (typeof forwarded === 'string') {
			return forwarded.split(',')[0]?.trim() ?? request.ip ?? 'unknown'
		}

		const realIp = request.headers['x-real-ip']
		if (typeof realIp === 'string') {
			return realIp
		}

		return request.ip ?? 'unknown'
	}

	/**
	 * Set rate limit response headers
	 */
	private setRateLimitHeaders(
		response: Response,
		limit: number,
		remaining: number,
		resetAt: Date,
	): void {
		response.setHeader('X-RateLimit-Limit', limit.toString())
		response.setHeader('X-RateLimit-Remaining', remaining.toString())
		response.setHeader('X-RateLimit-Reset', resetAt.toISOString())
	}
}
