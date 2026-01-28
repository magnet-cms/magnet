import { Type } from 'class-transformer'
import {
	ArrayMinSize,
	IsArray,
	IsDate,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	MaxLength,
	Min,
	MinLength,
} from 'class-validator'

/**
 * DTO for creating a new API key
 *
 * @example
 * ```typescript
 * const dto: CreateApiKeyDto = {
 *   name: 'My Integration',
 *   permissions: ['content.read', 'content.write'],
 *   allowedSchemas: ['posts', 'categories'],
 *   rateLimit: 500,
 * }
 * ```
 */
export class CreateApiKeyDto {
	/**
	 * Human-readable name for the key
	 */
	@IsString()
	@IsNotEmpty()
	@MinLength(2)
	@MaxLength(100)
	name!: string

	/**
	 * Optional description of what this key is used for
	 */
	@IsString()
	@IsOptional()
	@MaxLength(500)
	description?: string

	/**
	 * Permission scopes granted to this key
	 * Use '*' for full access, or specific scopes like 'content.read'
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
	 * Rate limit: requests per hour
	 */
	@IsNumber()
	@Min(1)
	@IsOptional()
	rateLimit?: number
}
