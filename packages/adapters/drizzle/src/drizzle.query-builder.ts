import type {
	BaseSchema,
	FilterQuery,
	PaginatedResult,
	ProjectionQuery,
	QueryBuilder,
	SortQuery,
} from '@magnet-cms/common'
import {
	and,
	asc,
	desc,
	eq,
	gt,
	gte,
	ilike,
	inArray,
	isNotNull,
	isNull,
	like,
	lt,
	lte,
	ne,
	notInArray,
	or,
	sql,
} from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import type { DrizzleDB } from './types'

/**
 * Drizzle implementation of QueryBuilder for fluent database queries.
 * Provides chainable methods for filtering, sorting, pagination, and projection.
 *
 * @example
 * ```typescript
 * const users = await userModel.query()
 *   .where({ status: 'active', age: { $gte: 18 } })
 *   .sort({ createdAt: -1 })
 *   .limit(10)
 *   .skip(20)
 *   .exec()
 * ```
 */
export class DrizzleQueryBuilder<T> implements QueryBuilder<T> {
	private filterConditions: any[] = []
	private sortSpecs: { column: any; direction: 'asc' | 'desc' }[] = []
	private selectedColumns: string[] = []
	private limitValue?: number
	private skipValue?: number
	private currentLocale?: string
	private currentVersion?: string

	constructor(
		private readonly db: DrizzleDB,
		private readonly table: PgTable,
		locale?: string,
		version?: string,
	) {
		this.currentLocale = locale
		this.currentVersion = version
	}

	/**
	 * Add filter conditions to the query.
	 * Supports MongoDB-style operators like $gt, $lt, $in, $regex, etc.
	 */
	where(filter: FilterQuery<T>): this {
		const conditions = this.mapFilter(filter)
		this.filterConditions.push(...conditions)
		return this
	}

	/**
	 * Add additional AND conditions
	 */
	and(filter: FilterQuery<T>): this {
		const conditions = this.mapFilter(filter)
		this.filterConditions.push(...conditions)
		return this
	}

	/**
	 * Add OR conditions
	 */
	or(filters: FilterQuery<T>[]): this {
		const orConditions = filters.map((f) => {
			const conditions = this.mapFilter(f)
			return conditions.length > 1 ? and(...conditions) : conditions[0]
		})

		if (orConditions.length > 0) {
			this.filterConditions.push(or(...orConditions))
		}

		return this
	}

	/**
	 * Sort results by specified fields.
	 * Values can be 1 (asc), -1 (desc), 'asc', or 'desc'.
	 */
	sort(sort: SortQuery<T>): this {
		const tableAny = this.table as any

		for (const [key, direction] of Object.entries(sort)) {
			const snakeKey = this.toSnakeCase(key)
			const column = tableAny[snakeKey] || tableAny[key]

			if (column) {
				const dir = direction === -1 || direction === 'desc' ? 'desc' : 'asc'
				this.sortSpecs.push({ column, direction: dir })
			}
		}

		return this
	}

	/**
	 * Limit the number of results
	 */
	limit(count: number): this {
		this.limitValue = count
		return this
	}

	/**
	 * Skip a number of results (for pagination)
	 */
	skip(count: number): this {
		this.skipValue = count
		return this
	}

	/**
	 * Select specific fields to return
	 */
	select(projection: ProjectionQuery<T>): this {
		for (const [key, include] of Object.entries(projection)) {
			if (include) {
				this.selectedColumns.push(key)
			}
		}
		return this
	}

	/**
	 * Set the locale for query results
	 */
	locale(locale: string): this {
		this.currentLocale = locale
		return this
	}

	/**
	 * Set the version filter for query
	 */
	version(versionId: string): this {
		this.currentVersion = versionId
		return this
	}

	/**
	 * Execute the query and return all matching documents
	 */
	async exec(): Promise<BaseSchema<T>[]> {
		const tableAny = this.table as any

		// Build the base query
		let query = (this.db as any).select().from(this.table)

		// Apply locale filter if set
		if (this.currentLocale && 'locale' in tableAny) {
			this.filterConditions.push(eq(tableAny.locale, this.currentLocale))
		}

		// Apply version/status filter if set
		if (this.currentVersion && 'status' in tableAny) {
			if (['draft', 'published', 'archived'].includes(this.currentVersion)) {
				this.filterConditions.push(eq(tableAny.status, this.currentVersion))
			}
		}

		// Apply filters
		if (this.filterConditions.length > 0) {
			query = query.where(and(...this.filterConditions))
		}

		// Apply sorting
		if (this.sortSpecs.length > 0) {
			const orderBy = this.sortSpecs.map((s) =>
				s.direction === 'desc' ? desc(s.column) : asc(s.column),
			)
			query = query.orderBy(...orderBy)
		}

		// Apply limit
		if (this.limitValue !== undefined) {
			query = query.limit(this.limitValue)
		}

		// Apply offset
		if (this.skipValue !== undefined) {
			query = query.offset(this.skipValue)
		}

		const results = await query

		return results.map((row: any) => this.mapResult(row))
	}

	/**
	 * Execute the query and return a single document
	 */
	async execOne(): Promise<BaseSchema<T> | null> {
		this.limitValue = 1
		const results = await this.exec()
		return results[0] ?? null
	}

	/**
	 * Count matching documents without fetching them
	 */
	async count(): Promise<number> {
		const tableAny = this.table as any

		let query = (this.db as any)
			.select({ count: sql<number>`count(*)` })
			.from(this.table)

		// Apply locale filter if set
		if (this.currentLocale && 'locale' in tableAny) {
			this.filterConditions.push(eq(tableAny.locale, this.currentLocale))
		}

		// Apply version/status filter if set
		if (this.currentVersion && 'status' in tableAny) {
			if (['draft', 'published', 'archived'].includes(this.currentVersion)) {
				this.filterConditions.push(eq(tableAny.status, this.currentVersion))
			}
		}

		// Apply filters
		if (this.filterConditions.length > 0) {
			query = query.where(and(...this.filterConditions))
		}

		const result = await query
		return Number(result[0]?.count || 0)
	}

	/**
	 * Check if any matching documents exist
	 */
	async exists(): Promise<boolean> {
		const count = await this.count()
		return count > 0
	}

	/**
	 * Execute with pagination info
	 */
	async paginate(): Promise<PaginatedResult<BaseSchema<T>>> {
		const [data, total] = await Promise.all([this.exec(), this.count()])

		return {
			data,
			total,
			limit: this.limitValue,
			page:
				this.limitValue && this.skipValue !== undefined
					? Math.floor(this.skipValue / this.limitValue) + 1
					: undefined,
		}
	}

	/**
	 * Map MongoDB-style filter operators to Drizzle conditions
	 */
	private mapFilter(filter: Record<string, any>): any[] {
		const tableAny = this.table as any
		const conditions: any[] = []

		for (const [key, value] of Object.entries(filter)) {
			// Handle logical operators
			if (key === '$and' && Array.isArray(value)) {
				const andConditions = value.flatMap((f) => this.mapFilter(f))
				if (andConditions.length > 0) {
					conditions.push(and(...andConditions))
				}
				continue
			}

			if (key === '$or' && Array.isArray(value)) {
				const orConditions = value.map((f) => {
					const conds = this.mapFilter(f)
					return conds.length > 1 ? and(...conds) : conds[0]
				})
				if (orConditions.length > 0) {
					conditions.push(or(...orConditions))
				}
				continue
			}

			// Get the column
			const snakeKey = this.toSnakeCase(key)
			const column = tableAny[snakeKey] || tableAny[key]

			if (!column) continue

			// Handle operator objects
			if (
				value !== null &&
				typeof value === 'object' &&
				!Array.isArray(value)
			) {
				for (const [op, opValue] of Object.entries(value)) {
					const condition = this.mapOperator(column, op, opValue)
					if (condition) {
						conditions.push(condition)
					}
				}
			} else {
				// Simple equality
				conditions.push(eq(column, value))
			}
		}

		return conditions
	}

	/**
	 * Map a single operator to a Drizzle condition
	 */
	private mapOperator(column: any, operator: string, value: any): any {
		switch (operator) {
			case '$eq':
				return eq(column, value)
			case '$ne':
				return ne(column, value)
			case '$gt':
				return gt(column, value)
			case '$gte':
				return gte(column, value)
			case '$lt':
				return lt(column, value)
			case '$lte':
				return lte(column, value)
			case '$in':
				return inArray(column, value)
			case '$nin':
				return notInArray(column, value)
			case '$regex':
				// Use ILIKE for case-insensitive matching
				return ilike(column, `%${value}%`)
			case '$like':
				return like(column, value)
			case '$ilike':
				return ilike(column, value)
			case '$null':
				return value ? isNull(column) : isNotNull(column)
			case '$exists':
				return value ? isNotNull(column) : isNull(column)
			default:
				// Unknown operator - skip
				return null
		}
	}

	/**
	 * Map a database row to a result with camelCase keys
	 */
	private mapResult(row: any): BaseSchema<T> {
		const result: Record<string, any> = {}

		for (const [key, value] of Object.entries(row)) {
			const camelKey = this.toCamelCase(key)

			// Convert timestamp fields to Date objects if they're strings or Date objects
			// Drizzle returns timestamps as Date objects from PostgreSQL, but we ensure they're proper Date instances
			if (
				value !== null &&
				value !== undefined &&
				(camelKey === 'createdAt' ||
					camelKey === 'updatedAt' ||
					camelKey === 'publishedAt' ||
					key.endsWith('_at') ||
					camelKey.endsWith('At'))
			) {
				// If value is already a Date object, use it as-is
				if (value instanceof Date) {
					result[camelKey] = value
				} else if (typeof value === 'string') {
					// If it's a string, parse it to a Date
					const dateValue = new Date(value)
					result[camelKey] = Number.isNaN(dateValue.getTime())
						? value
						: dateValue
				} else {
					// For other types (shouldn't happen), pass through
					result[camelKey] = value
				}
			} else {
				result[camelKey] = value
			}
		}

		return result as BaseSchema<T>
	}

	/**
	 * Convert camelCase to snake_case
	 */
	private toSnakeCase(str: string): string {
		return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
	}

	/**
	 * Convert snake_case to camelCase
	 */
	private toCamelCase(str: string): string {
		return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
	}
}
