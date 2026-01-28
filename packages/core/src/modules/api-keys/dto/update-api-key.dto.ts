import { Type } from 'class-transformer'
import {
	ArrayMinSize,
	IsArray,
	IsBoolean,
	IsDate,
	IsNumber,
	IsOptional,
	IsString,
	MaxLength,
	Min,
	MinLength,
} from 'class-validator'

/**
 * DTO for updating an existing API key
 *
 * Note: The key itself cannot be updated - only its metadata.
 * To change the key, use the rotate endpoint.
 *
 * @example
 * ```typescript
 * const dto: UpdateApiKeyDto = {
 *   name: 'Updated Integration Name',
 *   permissions: ['content.read'],
 *   rateLimit: 100,
 * }
 * ```
 */
export class UpdateApiKeyDto {
	/**
	 * Human-readable name for the key
	 */
	@IsString()
	@IsOptional()
	@MinLength(2)
	@MaxLength(100)
	name?: string

	/**
	 * Optional description of what this key is used for
	 */
	@IsString()
	@IsOptional()
	@MaxLength(500)
	description?: string

	/**
	 * Permission scopes granted to this key
	 */
	@IsArray()
	@IsString({ each: true })
	@ArrayMinSize(1)
	@IsOptional()
	permissions?: string[]

	/**
	 * Restrict key to specific content schemas (empty = all)
	 */
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	allowedSchemas?: string[]

	/**
	 * Allowed CORS origins for this key
	 */
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	allowedOrigins?: string[]

	/**
	 * IP whitelist (empty = allow all)
	 */
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	allowedIps?: string[]

	/**
	 * Optional expiration date for the key
	 */
	@IsDate()
	@IsOptional()
	@Type(() => Date)
	expiresAt?: Date

	/**
	 * Whether the key is active
	 */
	@IsBoolean()
	@IsOptional()
	enabled?: boolean

	/**
	 * Rate limit: requests per hour
	 */
	@IsNumber()
	@Min(1)
	@IsOptional()
	rateLimit?: number
}
