import {
  isCastError,
  isDuplicateKeyError,
  isPostgresUniqueError,
  isValidationError,
} from '../utils/type-guards'

import { MagnetError, OperationType } from './base.error'
import { DatabaseError, DuplicateKeyError } from './database.error'
import { DocumentNotFoundError } from './resource.error'
import { ValidationError } from './validation.error'

/**
 * Context for error conversion
 */
interface ErrorContext {
  schema?: string
  operation?: string
}

/**
 * Convert MongoDB/Mongoose errors to typed Magnet errors
 * @param error - The original error from Mongoose
 * @param context - Optional context about the operation
 * @returns A typed MagnetError
 */
export function fromMongooseError(error: unknown, context?: ErrorContext): MagnetError {
  // Handle CastError on _id field (invalid ObjectId)
  if (isCastError(error) && error.path === '_id') {
    return new DocumentNotFoundError(context?.schema ?? 'document', String(error.value), {
      operation: context?.operation as OperationType | undefined,
    })
  }

  // Handle duplicate key error (unique constraint violation)
  if (isDuplicateKeyError(error)) {
    const keyValue = error.keyValue
    const field = Object.keys(keyValue)[0] ?? 'field'
    const value = keyValue[field]
    return new DuplicateKeyError(field, value, { schema: context?.schema })
  }

  // Handle Mongoose validation error
  if (isValidationError(error)) {
    const details = Object.entries(error.errors).map(([field, err]) => {
      const errorObj = err as { message?: string }
      return {
        field,
        message: String(errorObj.message ?? 'Validation failed'),
      }
    })
    return new ValidationError('Validation failed', details, {
      schema: context?.schema,
    })
  }

  // Fallback to generic database error
  return new DatabaseError(
    error instanceof Error ? error.message : 'Database operation failed',
    error,
    { schema: context?.schema },
  )
}

/**
 * Extract field and value from PostgreSQL unique constraint error
 */
function extractPostgresUniqueInfo(error: { code: string; detail?: string }): {
  field: string
  value: unknown
} | null {
  if (!error.detail) {
    return null
  }

  // PostgreSQL format: Key (field)=(value) already exists.
  const match = error.detail.match(/Key \((\w+)\)=\(([^)]+)\)/)
  const field = match?.[1]
  const value = match?.[2]
  if (field && value) {
    return { field, value }
  }

  return null
}

/**
 * Convert Drizzle/PostgreSQL errors to typed Magnet errors
 * @param error - The original error from Drizzle
 * @param context - Optional context about the operation
 * @returns A typed MagnetError
 */
export function fromDrizzleError(error: unknown, context?: ErrorContext): MagnetError {
  // Handle PostgreSQL unique constraint violation
  if (isPostgresUniqueError(error)) {
    const info = extractPostgresUniqueInfo(error)
    if (info) {
      return new DuplicateKeyError(info.field, info.value, {
        schema: context?.schema,
      })
    }
  }

  // Handle generic unique constraint message
  if (error instanceof Error && error.message.includes('unique constraint')) {
    const match = error.message.match(/Key \((\w+)\)=\(([^)]+)\)/)
    const field = match?.[1]
    const value = match?.[2]
    if (field && value) {
      return new DuplicateKeyError(field, value, {
        schema: context?.schema,
      })
    }
  }

  // Handle not found
  if (error instanceof Error && error.message.includes('no result')) {
    return new DocumentNotFoundError(context?.schema ?? 'document', 'unknown', {
      operation: 'read',
    })
  }

  // Fallback to generic database error
  return new DatabaseError(
    error instanceof Error ? error.message : 'Database operation failed',
    error,
    { schema: context?.schema },
  )
}

/**
 * Check if an error is a MagnetError
 */
export function isMagnetError(error: unknown): error is MagnetError {
  return error instanceof MagnetError
}

/**
 * Wrap an unknown error as a MagnetError
 * If already a MagnetError, returns it unchanged
 */
export function wrapError(error: unknown, fallbackMessage = 'An error occurred'): MagnetError {
  if (isMagnetError(error)) {
    return error
  }

  return new DatabaseError(error instanceof Error ? error.message : fallbackMessage, error)
}
