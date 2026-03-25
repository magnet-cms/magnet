import { ErrorCode, ErrorMetadata, MagnetError } from './base.error'

/**
 * Internal error
 * Used for unexpected server errors
 */
export class InternalError extends MagnetError {
  readonly code = ErrorCode.INTERNAL_ERROR
  readonly httpStatus = 500

  constructor(message = 'An internal error occurred', metadata?: ErrorMetadata) {
    super(message, metadata)
  }
}

/**
 * Configuration error
 * Used when application configuration is invalid
 */
export class ConfigurationError extends MagnetError {
  readonly code = ErrorCode.CONFIGURATION_ERROR
  readonly httpStatus = 500

  constructor(message: string, metadata?: ErrorMetadata) {
    super(`Configuration error: ${message}`, metadata)
  }
}

/**
 * Unexpected error
 * Used as a fallback for unknown error types
 */
export class UnexpectedError extends MagnetError {
  readonly code = ErrorCode.UNEXPECTED_ERROR
  readonly httpStatus = 500
  readonly originalError?: unknown

  constructor(
    message = 'An unexpected error occurred',
    originalError?: unknown,
    metadata?: ErrorMetadata,
  ) {
    super(message, metadata)
    this.originalError = originalError
  }
}
