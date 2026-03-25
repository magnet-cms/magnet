/**
 * Type guard utilities for safe type narrowing
 * Use these instead of type assertions (as any, as unknown as T)
 */

/**
 * Check if value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Check if value has a specific property
 */
export function hasProperty<K extends string>(value: unknown, key: K): value is Record<K, unknown> {
  return isObject(value) && key in value
}

/**
 * Check if value has multiple properties
 */
export function hasProperties<K extends string>(
  value: unknown,
  keys: K[],
): value is Record<K, unknown> {
  return isObject(value) && keys.every((key) => key in value)
}

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value)
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Check if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/**
 * Check if value is a string array
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/**
 * Check if value is a function
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function'
}

/**
 * Check if value is a valid document with ID
 */
export function isDocument(value: unknown): value is { id: string; [key: string]: unknown } {
  return isObject(value) && hasProperty(value, 'id') && typeof value.id === 'string'
}

/**
 * Check if error is a MongoDB CastError
 */
export function isCastError(
  error: unknown,
): error is { name: 'CastError'; path: string; value: unknown } {
  return (
    isObject(error) &&
    hasProperty(error, 'name') &&
    error.name === 'CastError' &&
    hasProperty(error, 'path') &&
    typeof error.path === 'string'
  )
}

/**
 * Check if error is a MongoDB duplicate key error
 */
export function isDuplicateKeyError(
  error: unknown,
): error is { code: 11000; keyValue: Record<string, unknown> } {
  return isObject(error) && hasProperty(error, 'code') && error.code === 11000
}

/**
 * Check if error is a Mongoose validation error
 */
export function isValidationError(
  error: unknown,
): error is { name: 'ValidationError'; errors: Record<string, unknown> } {
  return (
    isObject(error) &&
    hasProperty(error, 'name') &&
    error.name === 'ValidationError' &&
    hasProperty(error, 'errors')
  )
}

/**
 * Check if error is a PostgreSQL unique constraint violation
 */
export function isPostgresUniqueError(error: unknown): error is { code: string; detail?: string } {
  return isObject(error) && hasProperty(error, 'code') && error.code === '23505'
}

/**
 * Check if an object has a method
 */
export function hasMethod<K extends string>(
  value: unknown,
  methodName: K,
): value is Record<K, (...args: unknown[]) => unknown> {
  return (
    isObject(value) && hasProperty(value, methodName) && typeof value[methodName] === 'function'
  )
}

/**
 * Check if value has setLocale method (for i18n documents)
 */
export function hasSetLocale<T>(value: T): value is T & { setLocale: (locale: string) => T } {
  return isObject(value) && hasMethod(value, 'setLocale')
}

/**
 * Check if value has toString method that returns string
 */
export function hasToString(value: unknown): value is { toString(): string } {
  return isObject(value) && hasMethod(value, 'toString')
}

/**
 * Assert value is defined (not null or undefined)
 * Throws if value is null or undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string,
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Value is null or undefined')
  }
}

/**
 * Assert condition is true
 * Throws if condition is false
 */
export function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message ?? 'Assertion failed')
  }
}

/**
 * Safely get a string ID from a document that might have _id or id
 * Returns undefined if no valid ID found
 */
export function getDocumentId(doc: unknown): string | undefined {
  if (!isObject(doc)) return undefined

  // Check for id first
  if (hasProperty(doc, 'id') && typeof doc.id === 'string') {
    return doc.id
  }

  // Check for _id with toString
  if (hasProperty(doc, '_id')) {
    if (typeof doc._id === 'string') {
      return doc._id
    }
    if (hasToString(doc._id)) {
      return doc._id.toString()
    }
  }

  return undefined
}

/**
 * Type guard for checking if an object matches a record with string values
 */
export function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isObject(value)) return false
  return Object.values(value).every((v) => typeof v === 'string')
}

// Re-export VersionDocument from model for convenience
export type { VersionDocument } from '../model/base.model'

/**
 * Check if value is a version document
 */
export function isVersionDocument(
  value: unknown,
): value is import('../model/base.model').VersionDocument {
  return (
    isObject(value) &&
    hasProperty(value, 'documentId') &&
    typeof value.documentId === 'string' &&
    hasProperty(value, 'versionId') &&
    typeof value.versionId === 'string' &&
    hasProperty(value, 'schemaName') &&
    typeof value.schemaName === 'string' &&
    hasProperty(value, 'status') &&
    hasProperty(value, 'data') &&
    isObject(value.data)
  )
}
