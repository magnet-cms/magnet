import { ValidationException } from '@magnet-cms/common'
import { ErrorCode, MagnetError } from '@magnet-cms/common'
import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
} from '@nestjs/common'
import { ValidationError } from 'class-validator'
import { MagnetLogger } from '~/modules/logging/logger.service'
import { formatValidationErrors } from '~/utils'

/**
 * Request type with optional user
 */
interface RequestWithUser extends Request {
	user?: { id?: string }
}

/**
 * Legacy exception response format for backward compatibility
 */
interface LegacyExceptionResponse {
	statusCode: number
	message: string | string[]
	errors: Record<string, string[]> | null
	timestamp: string
	path: string
}

/**
 * Global exception filter that handles all errors in the application
 * Supports both new MagnetError types and legacy error handling
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
	constructor(private readonly logger: MagnetLogger) {
		this.logger.setContext(GlobalExceptionFilter.name)
	}

	catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse()
		const request = ctx.getRequest<RequestWithUser>()

		// Forward to Sentry if the @magnet-cms/plugin-sentry plugin is installed
		// and Sentry has been initialized. This is a no-op when the plugin is absent.
		// @sentry/nestjs is an optional peer dependency of @magnet-cms/core.
		try {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const Sentry = require('@sentry/nestjs') as {
				getClient: () => unknown
				captureException: (e: unknown) => void
			}
			if (Sentry.getClient()) {
				Sentry.captureException(exception)
			}
		} catch {
			// @sentry/nestjs not installed — no-op
		}

		// Handle MagnetError types (new error infrastructure)
		if (exception instanceof MagnetError) {
			this.logError(exception, request)
			const status = exception.httpStatus
			const errorResponse = exception.toResponse()
			response.status(status).json(errorResponse)
			return
		}

		// Handle legacy error types for backward compatibility
		const legacyResponse = this.buildLegacyResponse(exception, request)
		this.logLegacyError(exception, request, legacyResponse.statusCode)
		response.status(legacyResponse.statusCode).json(legacyResponse)
	}

	/**
	 * Build legacy response format for backward compatibility
	 */
	private buildLegacyResponse(
		exception: unknown,
		request: RequestWithUser,
	): LegacyExceptionResponse {
		let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR
		let message: string | string[] = 'Internal server error'
		let errors: Record<string, string[]> | null = null

		if (exception instanceof ValidationError) {
			statusCode = HttpStatus.BAD_REQUEST
			message = 'Validation failed'
			errors = formatValidationErrors([exception])
		}

		if (exception instanceof ValidationException) {
			statusCode = HttpStatus.BAD_REQUEST
			message = 'Validation failed'
			errors = formatValidationErrors(exception.errors)
		}

		if (exception instanceof HttpException) {
			statusCode = exception.getStatus()
			const exceptionResponse = exception.getResponse()

			if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
				const responseObj = exceptionResponse as {
					message?: string | string[]
					errors?: Record<string, string[]> | null
				}
				message = responseObj.message ?? message
				errors = responseObj.errors ?? null
			} else if (typeof exceptionResponse === 'string') {
				message = exceptionResponse
			}
		}

		return {
			statusCode,
			message,
			errors,
			timestamp: new Date().toISOString(),
			path: request.url,
		}
	}

	/**
	 * Log MagnetError with structured context
	 */
	private logError(exception: MagnetError, request: RequestWithUser): void {
		this.logger.error(exception.message, undefined, {
			...exception.toJSON(),
			path: request.url,
			method: request.method,
			userId: request.user?.id,
		})
	}

	/**
	 * Log legacy errors
	 */
	private logLegacyError(
		exception: unknown,
		request: RequestWithUser,
		statusCode: number,
	): void {
		const errorMessage =
			exception instanceof Error ? exception.message : 'Unknown error'
		const stack = exception instanceof Error ? exception.stack : undefined

		this.logger.error(errorMessage, stack, {
			statusCode,
			path: request.url,
			method: request.method,
			userId: request.user?.id,
		})
	}
}

/**
 * Map HTTP status codes to ErrorCode for NestJS HttpExceptions
 */
export function mapHttpStatusToErrorCode(status: number): ErrorCode {
	const mapping: Record<number, ErrorCode> = {
		400: ErrorCode.VALIDATION_FAILED,
		401: ErrorCode.AUTHENTICATION_REQUIRED,
		403: ErrorCode.PERMISSION_DENIED,
		404: ErrorCode.RESOURCE_NOT_FOUND,
		409: ErrorCode.DUPLICATE_KEY,
		500: ErrorCode.INTERNAL_ERROR,
	}

	return mapping[status] ?? ErrorCode.UNEXPECTED_ERROR
}
