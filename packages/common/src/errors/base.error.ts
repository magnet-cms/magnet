/**
 * Error codes for programmatic error handling
 * Organized by category for easy identification
 */
export enum ErrorCode {
	// Validation errors (1xxx)
	VALIDATION_FAILED = 1000,
	REQUIRED_FIELD_MISSING = 1001,
	INVALID_FORMAT = 1002,
	VALUE_OUT_OF_RANGE = 1003,
	UNIQUE_CONSTRAINT_VIOLATION = 1004,

	// Authentication errors (2xxx)
	AUTHENTICATION_REQUIRED = 2000,
	INVALID_CREDENTIALS = 2001,
	TOKEN_EXPIRED = 2002,
	TOKEN_INVALID = 2003,
	ACCOUNT_LOCKED = 2004,
	EMAIL_NOT_VERIFIED = 2005,

	// Authorization errors (3xxx)
	PERMISSION_DENIED = 3000,
	INSUFFICIENT_PERMISSIONS = 3001,
	ROLE_NOT_FOUND = 3002,
	PERMISSION_NOT_FOUND = 3003,

	// Resource errors (4xxx)
	RESOURCE_NOT_FOUND = 4000,
	SCHEMA_NOT_FOUND = 4001,
	DOCUMENT_NOT_FOUND = 4002,
	USER_NOT_FOUND = 4003,
	FILE_NOT_FOUND = 4004,
	VERSION_NOT_FOUND = 4005,

	// Database errors (5xxx)
	DATABASE_ERROR = 5000,
	CONNECTION_FAILED = 5001,
	QUERY_FAILED = 5002,
	TRANSACTION_FAILED = 5003,
	DUPLICATE_KEY = 5004,

	// Plugin errors (6xxx)
	PLUGIN_ERROR = 6000,
	PLUGIN_NOT_FOUND = 6001,
	PLUGIN_INITIALIZATION_FAILED = 6002,
	HOOK_EXECUTION_FAILED = 6003,

	// External service errors (7xxx)
	EXTERNAL_SERVICE_ERROR = 7000,
	STORAGE_ERROR = 7001,
	EMAIL_SERVICE_ERROR = 7002,
	WEBHOOK_DELIVERY_FAILED = 7003,

	// Internal errors (9xxx)
	INTERNAL_ERROR = 9000,
	CONFIGURATION_ERROR = 9001,
	UNEXPECTED_ERROR = 9999,
}

/**
 * Operation types for error metadata
 */
export type OperationType = 'create' | 'read' | 'update' | 'delete' | 'publish'

/**
 * Error metadata for additional context
 */
export interface ErrorMetadata {
	/** Schema/collection name */
	schema?: string
	/** Field name that caused the error */
	field?: string
	/** Document/resource ID */
	resourceId?: string
	/** Operation being performed */
	operation?: OperationType
	/** Additional context */
	context?: Record<string, unknown>
}

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
	field: string
	message: string
	constraint?: string
	value?: unknown
}

/**
 * Standard error response structure for API consumers
 */
export interface ErrorResponse {
	error: {
		code: ErrorCode
		message: string
		name: string
		timestamp: string
		metadata?: ErrorMetadata
		details?: ValidationErrorDetail[]
	}
}

/**
 * Base error class for all Magnet errors
 * Provides consistent error handling with codes, metadata, and serialization
 */
export abstract class MagnetError extends Error {
	abstract readonly code: ErrorCode
	abstract readonly httpStatus: number
	readonly timestamp: Date
	readonly metadata: ErrorMetadata

	constructor(message: string, metadata: ErrorMetadata = {}) {
		super(message)
		this.name = this.constructor.name
		this.timestamp = new Date()
		this.metadata = metadata

		// Maintains proper stack trace for where error was thrown
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor)
		}
	}

	/**
	 * Convert to API response format
	 */
	toResponse(): ErrorResponse {
		return {
			error: {
				code: this.code,
				message: this.message,
				name: this.name,
				timestamp: this.timestamp.toISOString(),
				metadata: this.metadata,
			},
		}
	}

	/**
	 * Convert to JSON for logging
	 */
	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			code: this.code,
			message: this.message,
			httpStatus: this.httpStatus,
			timestamp: this.timestamp.toISOString(),
			metadata: this.metadata,
			stack: this.stack,
		}
	}
}
