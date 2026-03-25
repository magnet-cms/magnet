import { ErrorCode, ErrorMetadata, MagnetError } from './base.error'

/**
 * Generic database error
 * Used when a database operation fails
 */
export class DatabaseError extends MagnetError {
  readonly code = ErrorCode.DATABASE_ERROR
  readonly httpStatus = 500
  readonly originalError?: unknown

  constructor(message: string, originalError?: unknown, metadata?: ErrorMetadata) {
    super(message, metadata)
    this.originalError = originalError
  }
}

/**
 * Database connection failed error
 */
export class ConnectionFailedError extends MagnetError {
  readonly code = ErrorCode.CONNECTION_FAILED
  readonly httpStatus = 503

  constructor(message = 'Database connection failed', metadata?: ErrorMetadata) {
    super(message, metadata)
  }
}

/**
 * Query failed error
 */
export class QueryFailedError extends MagnetError {
  readonly code = ErrorCode.QUERY_FAILED
  readonly httpStatus = 500
  readonly query?: string

  constructor(message: string, query?: string, metadata?: ErrorMetadata) {
    super(message, metadata)
    this.query = query
  }
}

/**
 * Transaction failed error
 */
export class TransactionFailedError extends MagnetError {
  readonly code = ErrorCode.TRANSACTION_FAILED
  readonly httpStatus = 500

  constructor(message = 'Transaction failed', metadata?: ErrorMetadata) {
    super(message, metadata)
  }
}

/**
 * Duplicate key error
 * Thrown when attempting to insert a duplicate value for a unique field
 */
export class DuplicateKeyError extends MagnetError {
  readonly code = ErrorCode.DUPLICATE_KEY
  readonly httpStatus = 409

  constructor(field: string, value: unknown, metadata?: ErrorMetadata) {
    super(`A record with ${field} '${String(value)}' already exists`, {
      ...metadata,
      field,
    })
  }
}
