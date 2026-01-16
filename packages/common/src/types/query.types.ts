/**
 * Query operator types for MongoDB-style queries
 */
export type QueryOperator<T> = {
	/** Equal to */
	$eq?: T
	/** Not equal to */
	$ne?: T
	/** Greater than */
	$gt?: T
	/** Greater than or equal to */
	$gte?: T
	/** Less than */
	$lt?: T
	/** Less than or equal to */
	$lte?: T
	/** In array */
	$in?: T[]
	/** Not in array */
	$nin?: T[]
	/** Field exists */
	$exists?: boolean
	/** Regular expression match */
	$regex?: string | RegExp
	/** Regex options (i, m, s, x) */
	$options?: string
}

/**
 * Filter value that supports both direct values and operators
 */
export type FilterValue<T> = T | QueryOperator<T>

/**
 * Full filter query type with logical operators
 */
export type FilterQuery<Schema> = {
	[K in keyof Schema]?: FilterValue<Schema[K]>
} & {
	/** Logical AND */
	$and?: FilterQuery<Schema>[]
	/** Logical OR */
	$or?: FilterQuery<Schema>[]
	/** Logical NOR */
	$nor?: FilterQuery<Schema>[]
}

/**
 * Sort direction
 */
export type SortDirection = 1 | -1 | 'asc' | 'desc'

/**
 * Sort specification
 */
export type SortQuery<Schema> = {
	[K in keyof Schema]?: SortDirection
}

/**
 * Projection specification for field selection
 */
export type ProjectionQuery<Schema> = {
	[K in keyof Schema]?: 0 | 1 | boolean
}

/**
 * Query execution options
 */
export interface QueryOptions {
	/** Maximum number of documents to return */
	limit?: number
	/** Number of documents to skip */
	skip?: number
	/** Return plain objects instead of documents */
	lean?: boolean
}

/**
 * Paginated query result
 */
export interface PaginatedResult<T> {
	/** Result data */
	data: T[]
	/** Total count of matching documents */
	total: number
	/** Current page (if using skip/limit) */
	page?: number
	/** Page size */
	limit?: number
}
