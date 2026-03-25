import type { AdapterName } from '../types/database.types'
import type { SchemaMetadata } from '../types/schema-metadata.types'

import type { QueryBuilder } from './query-builder'

export type BaseSchema<T> = { id: string } & T

export interface ModelCreateOptions {
  /** Skip database-level validation (useful for draft documents) */
  skipValidation?: boolean
}

export interface ModelUpdateOptions {
  /** Skip database-level validation (useful for draft documents) */
  skipValidation?: boolean
}

/**
 * Version document type for history/versioning
 */
export interface VersionDocument {
  /** ID of the original document */
  documentId: string
  /** Unique version identifier */
  versionId: string
  /** Name of the schema/collection */
  schemaName: string
  /** Version status */
  status: 'draft' | 'published' | 'archived'
  /** Snapshot of the document data at this version */
  data: Record<string, unknown>
  /** When this version was created */
  createdAt: Date
  /** Who created this version */
  createdBy?: string
  /** Type of change that created this version */
  changeType?: 'create' | 'update' | 'restore'
}

/**
 * Native access wrapper - provides type-safe native operations
 */
export interface NativeAccess<_T = unknown> {
  /**
   * Raw database/ORM instance (type varies by adapter)
   * For Mongoose: Model<Document>
   * For Drizzle: { db, table }
   */
  readonly raw: unknown

  /**
   * Execute raw query (adapter-specific syntax)
   * @param query - The raw query string
   * @param params - Query parameters
   */
  rawQuery<R = unknown>(query: string, params?: unknown[]): Promise<R>

  /**
   * Get adapter name for adapter-specific code
   */
  readonly adapterName: AdapterName
}

export abstract class Model<Schema> {
  // ============= CRUD Operations =============

  abstract create(
    data: Partial<BaseSchema<Schema>>,
    options?: ModelCreateOptions,
  ): Promise<BaseSchema<Schema>>
  abstract find(): Promise<BaseSchema<Schema>[]>
  abstract findById(id: string): Promise<BaseSchema<Schema> | null>
  abstract findOne(query: Partial<BaseSchema<Schema>>): Promise<BaseSchema<Schema> | null>
  abstract findMany(query: Partial<BaseSchema<Schema>>): Promise<BaseSchema<Schema>[]>
  abstract update(
    query: Partial<BaseSchema<Schema>>,
    data: Partial<BaseSchema<Schema>>,
    options?: ModelUpdateOptions,
  ): Promise<BaseSchema<Schema>>
  abstract delete(query: Partial<BaseSchema<Schema>>): Promise<boolean>

  // ============= Locale & Versioning =============

  /**
   * Set the locale for subsequent operations
   * @param locale The locale to use
   * @returns Cloned model instance with locale set
   */
  abstract locale(locale: string): this

  /**
   * Get current locale
   */
  getLocale(): string {
    // This is a base implementation that will be overridden by adapters
    return 'en'
  }

  /**
   * Set the version for subsequent operations
   * @param versionId The version ID or status ('draft', 'published', 'archived')
   * @returns Same instance (chainable)
   */
  version(_versionId: string): this {
    // This is a base implementation that will be overridden by adapters
    return this
  }

  /**
   * Check if versioning is enabled for this model
   */
  isVersioningEnabled(): boolean {
    // This is a base implementation that will be overridden by adapters
    return false
  }

  /**
   * Create a version snapshot of a document
   * @param documentId The document ID
   * @param data The data to version
   * @returns Version record or null if versioning disabled
   */
  createVersion(_documentId: string, _data: Partial<Schema>): Promise<VersionDocument | null> {
    // This is a base implementation that will be overridden by adapters
    return Promise.resolve(null)
  }

  /**
   * Find all versions of a document
   * @param documentId The document ID
   */
  findVersions(_documentId: string): Promise<VersionDocument[]> {
    // This is a base implementation that will be overridden by adapters
    return Promise.resolve([])
  }

  /**
   * Find a specific version by ID
   * @param versionId The version ID
   */
  findVersionById(_versionId: string): Promise<VersionDocument | null> {
    // This is a base implementation that will be overridden by adapters
    return Promise.resolve(null)
  }

  /**
   * Restore a document to a specific version
   * @param versionId The version ID to restore
   */
  restoreVersion(_versionId: string): Promise<BaseSchema<Schema> | null> {
    // This is a base implementation that will be overridden by adapters
    return Promise.resolve(null)
  }

  // ============= Query Builder =============

  /**
   * Create a query builder for advanced queries with sorting, pagination, and operators.
   * The query builder inherits the current locale/version context.
   *
   * @example
   * ```typescript
   * const results = await model.query()
   *   .where({ status: 'active', age: { $gte: 18 } })
   *   .sort({ createdAt: -1 })
   *   .limit(10)
   *   .exec()
   * ```
   */
  query(): QueryBuilder<Schema> {
    throw new Error('QueryBuilder not implemented by this adapter')
  }

  // ============= Native Access =============

  /**
   * Get access to the native database model/collection.
   * Use with caution - bypasses Magnet abstractions like locale and versioning.
   *
   * @returns Typed native access object
   */
  native(): NativeAccess<Schema> {
    throw new Error('Native access not implemented by this adapter')
  }

  // ============= Metadata =============

  /**
   * Get schema name
   */
  getSchemaName(): string {
    throw new Error('getSchemaName not implemented by this adapter')
  }

  /**
   * Get schema metadata
   */
  getMetadata(): SchemaMetadata {
    throw new Error('getMetadata not implemented by this adapter')
  }
}
