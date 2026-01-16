import type {
	FilterQuery,
	PaginatedResult,
	ProjectionQuery,
	SortQuery,
} from '../types/query.types'
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

	/**
	 * Sort results by specified fields
	 * @param sort Sort specification with field names and directions
	 */
	abstract sort(sort: SortQuery<Schema>): this

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
	 * Select specific fields to return
	 * @param projection Field selection (1 to include, 0 to exclude)
	 */
	abstract select(projection: ProjectionQuery<Schema>): this

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

	/**
	 * Execute with pagination info
	 * @returns Data array with total count
	 */
	abstract paginate(): Promise<PaginatedResult<BaseSchema<Schema>>>

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
}
