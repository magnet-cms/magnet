import {
	type BaseSchema,
	type FilterQuery,
	type PaginatedResult,
	type ProjectionQuery,
	QueryBuilder,
	type SortQuery,
} from '@magnet-cms/common'
import { toCamelCase, toSnakeCase } from '@magnet-cms/utils'
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
 * Type for dynamic table with columns accessible by string keys.
 * Note: We use `any` for column references because Drizzle's type system
 * doesn't support dynamic column access - this is a library limitation.
 * @see https://orm.drizzle.team/docs/dynamic-query-building
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DynamicTableColumn = any

/**
 * Type for dynamic table with columns accessible by string keys
 */
type DynamicTable = PgTable & Record<string, DynamicTableColumn>

/**
 * Type for database row from query results
 */
type DatabaseRow = Record<string, unknown>

/**
 * Type for Drizzle column reference (used for dynamic column access)
 */
type DrizzleColumn = DynamicTableColumn

/**
 * Drizzle-orm has internal type conflicts where SQL types from different
 * import paths are incompatible ("Two different types with this name exist").
 * This type alias documents the workaround using any for SQL conditions.
 * @see https://github.com/drizzle-team/drizzle-orm/issues/1510
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleCondition = any

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
export class DrizzleQueryBuilder<T> extends QueryBuilder<T> {
	private filterConditions: DrizzleCondition[] = []
	private sortSpecs: { column: DrizzleColumn; direction: 'asc' | 'desc' }[] = []
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
		super()
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
		const dynamicTable = this.table as DynamicTable

		for (const [key, direction] of Object.entries(sort)) {
			const snakeKey = toSnakeCase(key)
			const column = dynamicTable[snakeKey] || dynamicTable[key]

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
		const dynamicTable = this.table as DynamicTable
		const dbWithSelect = this.db as DrizzleDB & { select: Function }

		// Build the base query with $dynamic() to enable query reassignment
		const query = dbWithSelect.select().from(this.table).$dynamic()

		// Apply locale filter if set
		if (this.currentLocale && 'locale' in dynamicTable) {
			this.filterConditions.push(eq(dynamicTable.locale, this.currentLocale))
		}

		// Apply version/status filter if set
		if (this.currentVersion && 'status' in dynamicTable) {
			if (['draft', 'published', 'archived'].includes(this.currentVersion)) {
				this.filterConditions.push(eq(dynamicTable.status, this.currentVersion))
			}
		}

		// Apply filters - filter out undefined conditions
		const validConditions = this.filterConditions.filter(
			(c): c is NonNullable<typeof c> => c !== undefined,
		)
		if (validConditions.length > 0) {
			const whereCondition: DrizzleCondition = and(...validConditions)
			query.where(whereCondition)
		}

		// Apply sorting
		if (this.sortSpecs.length > 0) {
			const orderBy: DrizzleCondition[] = this.sortSpecs.map((s) =>
				s.direction === 'desc' ? desc(s.column) : asc(s.column),
			)
			query.orderBy(...orderBy)
		}

		// Apply limit
		if (this.limitValue !== undefined) {
			query.limit(this.limitValue)
		}

		// Apply offset
		if (this.skipValue !== undefined) {
			query.offset(this.skipValue)
		}

		const results = (await query) as DatabaseRow[]

		return results.map((row) => this.mapResult(row))
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
		const dynamicTable = this.table as DynamicTable
		const dbWithSelect = this.db as DrizzleDB & { select: Function }

		// Cast needed due to drizzle-orm SQL type conflicts
		const countSelect: DrizzleCondition = { count: sql<number>`count(*)` }
		const query = dbWithSelect.select(countSelect).from(this.table).$dynamic()

		// Apply locale filter if set
		if (this.currentLocale && 'locale' in dynamicTable) {
			this.filterConditions.push(eq(dynamicTable.locale, this.currentLocale))
		}

		// Apply version/status filter if set
		if (this.currentVersion && 'status' in dynamicTable) {
			if (['draft', 'published', 'archived'].includes(this.currentVersion)) {
				this.filterConditions.push(eq(dynamicTable.status, this.currentVersion))
			}
		}

		// Apply filters - filter out undefined conditions
		const validConditions = this.filterConditions.filter(
			(c): c is NonNullable<typeof c> => c !== undefined,
		)
		if (validConditions.length > 0) {
			const whereCondition: DrizzleCondition = and(...validConditions)
			query.where(whereCondition)
		}

		const result = (await query) as { count: number }[]
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
	 * Map MongoDB-style filter operators to Drizzle conditions.
	 * Note: Uses DynamicTableColumn for column references due to dynamic column access.
	 */
	private mapFilter(filter: Record<string, unknown>): DrizzleCondition[] {
		const dynamicTable = this.table as DynamicTable
		const conditions: DrizzleCondition[] = []

		for (const [key, value] of Object.entries(filter)) {
			// Handle logical operators
			if (key === '$and' && Array.isArray(value)) {
				const andConditions = value.flatMap((f) =>
					this.mapFilter(f as Record<string, unknown>),
				)
				const validAndConditions = andConditions.filter(
					(c): c is NonNullable<typeof c> => c !== undefined,
				)
				if (validAndConditions.length > 0) {
					conditions.push(and(...validAndConditions))
				}
				continue
			}

			if (key === '$or' && Array.isArray(value)) {
				const orConditions = value.map((f) => {
					const conds = this.mapFilter(f as Record<string, unknown>)
					const validConds = conds.filter(
						(c): c is NonNullable<typeof c> => c !== undefined,
					)
					return validConds.length > 1 ? and(...validConds) : validConds[0]
				})
				const validOrConditions = orConditions.filter(
					(c): c is NonNullable<typeof c> => c !== undefined,
				)
				if (validOrConditions.length > 0) {
					conditions.push(or(...validOrConditions))
				}
				continue
			}

			// Get the column
			const snakeKey = toSnakeCase(key)
			const column = dynamicTable[snakeKey] || dynamicTable[key]

			if (!column) continue

			// Handle operator objects
			if (
				value !== null &&
				typeof value === 'object' &&
				!Array.isArray(value)
			) {
				for (const [op, opValue] of Object.entries(
					value as Record<string, unknown>,
				)) {
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
	 * Map a single operator to a Drizzle condition.
	 * Note: Uses DynamicTableColumn for column parameter due to dynamic column access.
	 */
	private mapOperator(
		column: DynamicTableColumn,
		operator: string,
		value: unknown,
	): DrizzleCondition {
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
				return inArray(column, value as unknown[])
			case '$nin':
				return notInArray(column, value as unknown[])
			case '$regex':
				// Use ILIKE for case-insensitive matching
				return ilike(column, `%${value}%`)
			case '$like':
				return like(column, value as string)
			case '$ilike':
				return ilike(column, value as string)
			case '$null':
				return value ? isNull(column) : isNotNull(column)
			case '$exists':
				return value ? isNotNull(column) : isNull(column)
			default:
				// Unknown operator - skip
				return undefined
		}
	}

	/**
	 * Map a database row to a result with camelCase keys
	 */
	private mapResult(row: DatabaseRow): BaseSchema<T> {
		const result: Record<string, unknown> = {}

		for (const [key, value] of Object.entries(row)) {
			const camelKey = toCamelCase(key)

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
}
