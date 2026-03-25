import type { FilterQuery, PaginatedResult, ProjectionQuery, SortQuery } from '../types/query.types'

import type { BaseSchema } from './base.model'

/**
 * Abstract query builder for fluent database queries.
 * Provides chainable methods for filtering, sorting, pagination, and projection.
 *
 * @example
 * ```typescript
 * const users = await userModel.query()
 *   .where({ status: 'active' })
 *   .sort({ createdAt: -1 })
 *   .limit(10)
 *   .exec()
 * ```
 */
export abstract class QueryBuilder<Schema> {
  // ============= Filtering =============

  /**
   * Add filter conditions to the query
   * @param filter Filter conditions with optional operators
   */
  abstract where(filter: FilterQuery<Schema>): this

  /**
   * Add additional AND conditions
   * @param filter Filter conditions to AND with existing filters
   */
  abstract and(filter: FilterQuery<Schema>): this

  /**
   * Add OR conditions
   * @param filters Array of filter conditions for OR logic
   */
  abstract or(filters: FilterQuery<Schema>[]): this

  // ============= Ordering =============

  /**
   * Sort results by specified fields
   * @param sort Sort specification with field names and directions
   */
  abstract sort(sort: SortQuery<Schema>): this

  // ============= Pagination =============

  /**
   * Limit the number of results
   * @param count Maximum number of documents to return
   */
  abstract limit(count: number): this

  /**
   * Skip a number of results (for pagination)
   * @param count Number of documents to skip
   */
  abstract skip(count: number): this

  /**
   * Execute with pagination info
   * @param page Page number (1-indexed)
   * @param perPage Items per page
   * @returns Data array with pagination metadata
   */
  abstract paginate(page?: number, perPage?: number): Promise<PaginatedResult<BaseSchema<Schema>>>

  // ============= Field Selection =============

  /**
   * Select specific fields to return (inclusion)
   * @param projection Field selection (1 to include, 0 to exclude)
   */
  abstract select(projection: ProjectionQuery<Schema>): this

  /**
   * Exclude specific fields from results
   * @param fields Array of field names to exclude
   */
  exclude(fields: (keyof Schema | string)[]): this {
    // Default implementation converts to select with 0 values
    const projection: ProjectionQuery<Schema> = {} as ProjectionQuery<Schema>
    for (const field of fields) {
      ;(projection as Record<string, 0 | 1>)[field as string] = 0
    }
    return this.select(projection)
  }

  // ============= Locale & Version =============

  /**
   * Set the locale for query results
   * @param locale The locale to use
   */
  abstract locale(locale: string): this

  /**
   * Set the version filter for query
   * @param versionId The version ID or status
   */
  abstract version(versionId: string): this

  // ============= Execution =============

  /**
   * Execute the query and return all matching documents
   */
  abstract exec(): Promise<BaseSchema<Schema>[]>

  /**
   * Execute the query and return a single document
   */
  abstract execOne(): Promise<BaseSchema<Schema> | null>

  /**
   * Count matching documents without fetching them
   */
  abstract count(): Promise<number>

  /**
   * Check if any matching documents exist
   */
  abstract exists(): Promise<boolean>
}
