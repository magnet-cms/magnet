import type { BaseSchema } from '@magnet-cms/common'

import { toCamelCase } from './naming'

/**
 * Field mapping utilities for adapters.
 * Handles conversion between database field names and application field names.
 */

/**
 * Map a database document to application format.
 * Converts snake_case keys to camelCase and handles special field mappings.
 *
 * @param doc - Database document (may have snake_case keys)
 * @param options - Mapping options
 * @returns Document with camelCase keys
 */
export function mapDocumentFields<T>(
  doc: Record<string, unknown> | null | undefined,
  options?: {
    /** Custom field mappings (databaseKey -> applicationKey) */
    fieldMappings?: Record<string, string>
    /** Fields that should be converted to Date objects */
    dateFields?: string[]
    /** Function to map ID field (e.g., _id -> id) */
    mapId?: (doc: Record<string, unknown>) => {
      id: string
      rest: Record<string, unknown>
    }
  },
): BaseSchema<T> {
  if (!doc) {
    return {} as BaseSchema<T>
  }

  const { fieldMappings = {}, dateFields = [], mapId } = options ?? {}
  const result: Record<string, unknown> = {}

  // Handle ID mapping if provided
  let workingDoc = doc
  if (mapId) {
    const { id, rest } = mapId(doc)
    result.id = id
    workingDoc = rest
  }

  // Process each field
  for (const [key, value] of Object.entries(workingDoc)) {
    // Use custom mapping if available
    const mappedKey = fieldMappings[key] ?? toCamelCase(key)
    result[mappedKey] = value

    // Convert date fields
    if (dateFields.includes(mappedKey) || mappedKey.endsWith('At') || key.endsWith('_at')) {
      if (value instanceof Date) {
        result[mappedKey] = value
      } else if (typeof value === 'string') {
        const dateValue = new Date(value)
        result[mappedKey] = Number.isNaN(dateValue.getTime()) ? value : dateValue
      }
    }
  }

  return result as BaseSchema<T>
}

/**
 * Map a query object to database format.
 * Converts camelCase keys to snake_case and handles special field mappings.
 *
 * @param query - Query object (may have camelCase keys)
 * @param options - Mapping options
 * @returns Query object with database field names
 */
export function mapQueryFields<T>(
  query: Partial<BaseSchema<T>>,
  options?: {
    /** Custom field mappings (applicationKey -> databaseKey) */
    fieldMappings?: Record<string, string>
    /** Function to map ID field (e.g., id -> _id) */
    mapId?: (id: string) => Record<string, unknown>
  },
): Record<string, unknown> {
  if (!query || Object.keys(query).length === 0) {
    return {}
  }

  const { fieldMappings = {}, mapId } = options ?? {}
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(query)) {
    // Handle ID mapping if provided
    if (key === 'id' && mapId) {
      Object.assign(result, mapId(value as string))
      continue
    }

    // Use custom mapping or convert to snake_case
    const mappedKey = fieldMappings[key] ?? key
    result[mappedKey] = value
  }

  return result
}

/**
 * Check if a field name represents a timestamp/date field
 */
export function isDateField(fieldName: string): boolean {
  return (
    fieldName.endsWith('At') ||
    fieldName.endsWith('_at') ||
    ['createdAt', 'updatedAt', 'publishedAt', 'deletedAt'].includes(fieldName)
  )
}
