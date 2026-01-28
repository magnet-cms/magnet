import {
	IsIn,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Min,
} from 'class-validator'
import type { HttpMethod } from '../schemas/api-key-usage.schema'

/**
 * DTO for logging API key usage
 *
 * Used internally by the ApiKeyGuard to record each request.
 */
export class LogUsageDto {
	/**
	 * API endpoint that was accessed
	 */
	@IsString()
	@IsNotEmpty()
	endpoint!: string

	/**
	 * HTTP method used
	 */
	@IsString()
	@IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
	@IsNotEmpty()
	method!: HttpMethod

	/**
	 * HTTP status code of the response
	 */
	@IsNumber()
	@Min(100)
	@IsOptional()
	statusCode?: number

	/**
	 * Response time in milliseconds
	 */
	@IsNumber()
	@Min(0)
	@IsOptional()
	responseTime?: number

	/**
	 * IP address of the client
	 */
	@IsString()
	@IsOptional()
	ipAddress?: string

	/**
	 * User agent string from the request
	 */
	@IsString()
	@IsOptional()
	userAgent?: string

	/**
	 * Error message if the request failed
	 */
	@IsString()
	@IsOptional()
	error?: string

	/**
	 * Schema that was accessed (for content endpoints)
	 */
	@IsString()
	@IsOptional()
	schema?: string
}
