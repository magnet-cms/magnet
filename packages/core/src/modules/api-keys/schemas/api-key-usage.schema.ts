import { Field, Schema } from '@magnet-cms/common'
import {
	IsDate,
	IsIn,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Min,
} from 'class-validator'

/**
 * HTTP method types for logging
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * API Key Usage schema for tracking API key usage and analytics.
 *
 * Usage records are created for each API request authenticated with a key.
 * These records enable rate limiting, usage analytics, and debugging.
 *
 * @example
 * ```typescript
 * // Getting usage stats
 * const stats = await apiKeyService.getUsageStats(keyId, 7) // last 7 days
 * console.log(`Total requests: ${stats.totalRequests}`)
 * console.log(`Success rate: ${stats.successRate}%`)
 * ```
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class ApiKeyUsage {
	/**
	 * Document ID (assigned by database)
	 */
	id!: string

	/**
	 * ID of the API key that was used
	 */
	@Field.Text({ required: true })
	@Field.Validators(IsString(), IsNotEmpty())
	keyId!: string

	/**
	 * API endpoint that was accessed
	 */
	@Field.Text({ required: true })
	@Field.Validators(IsString(), IsNotEmpty())
	endpoint!: string

	/**
	 * HTTP method used
	 */
	@Field.Select({
		options: [
			{ label: 'GET', value: 'GET' },
			{ label: 'POST', value: 'POST' },
			{ label: 'PUT', value: 'PUT' },
			{ label: 'PATCH', value: 'PATCH' },
			{ label: 'DELETE', value: 'DELETE' },
		],
		required: true,
	})
	@Field.Validators(
		IsString(),
		IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
		IsNotEmpty(),
	)
	method!: HttpMethod

	/**
	 * HTTP status code of the response
	 */
	@Field.Number({})
	@Field.Validators(IsNumber(), Min(100), IsOptional())
	statusCode?: number

	/**
	 * Response time in milliseconds
	 */
	@Field.Number({})
	@Field.Validators(IsNumber(), Min(0), IsOptional())
	responseTime?: number

	/**
	 * IP address of the client
	 */
	@Field.Text({})
	@Field.Validators(IsString(), IsOptional())
	ipAddress?: string

	/**
	 * User agent string from the request
	 */
	@Field.Text({})
	@Field.Validators(IsString(), IsOptional())
	userAgent?: string

	/**
	 * When the request was made
	 */
	@Field.DateTime({ default: () => new Date() })
	@Field.Validators(IsDate())
	timestamp: Date = new Date()

	/**
	 * Error message if the request failed
	 */
	@Field.Text({})
	@Field.Validators(IsString(), IsOptional())
	error?: string

	/**
	 * Schema that was accessed (for content endpoints)
	 */
	@Field.Text({})
	@Field.Validators(IsString(), IsOptional())
	schema?: string
}
