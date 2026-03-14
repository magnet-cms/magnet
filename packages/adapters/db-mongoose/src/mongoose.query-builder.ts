import {
	type BaseSchema,
	type FilterQuery,
	type PaginatedResult,
	type ProjectionQuery,
	QueryBuilder,
	type SortQuery,
} from '@magnet-cms/common'
import type {
	Document,
	FilterQuery as MongooseFilterQuery,
	Model as MongooseModel,
} from 'mongoose'
import { mapDocumentId, mapQueryId } from '~/utils'

/**
 * Check if value is a non-null object
 */
function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Check if error is a MongoDB CastError
 */
function isCastError(
	error: unknown,
): error is { name: 'CastError'; path: string; value: unknown } {
	return (
		isObject(error) &&
		'name' in error &&
		error.name === 'CastError' &&
		'path' in error &&
		typeof error.path === 'string'
	)
}

/**
 * Type for internal filter accumulator
 */
type InternalFilter = MongooseFilterQuery<Document & BaseSchema<unknown>> & {
	$and?: MongooseFilterQuery<Document & BaseSchema<unknown>>[]
	$or?: MongooseFilterQuery<Document & BaseSchema<unknown>>[]
}

/**
 * Mongoose implementation of QueryBuilder for fluent database queries.
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
export class MongooseQueryBuilder<T> extends QueryBuilder<T> {
	private filterAccumulator: InternalFilter = {}
	private sortSpec: SortQuery<T> = {}
	private projectionSpec: ProjectionQuery<T> = {}
	private limitValue?: number
	private skipValue?: number
	private currentLocale?: string
	private currentVersion?: string

	constructor(
		private readonly modelOrPromise:
			| MongooseModel<Document & BaseSchema<T>>
			| Promise<MongooseModel<Document & BaseSchema<T>>>,
		locale?: string,
		version?: string,
	) {
		super()
		this.currentLocale = locale
		this.currentVersion = version
	}

	private async resolveModel(): Promise<
		MongooseModel<Document & BaseSchema<T>>
	> {
		return this.modelOrPromise instanceof Promise
			? this.modelOrPromise
			: this.modelOrPromise
	}

	/**
	 * Add filter conditions to the query
	 * Supports MongoDB operators like $gt, $lt, $in, $regex, etc.
	 */
	where(filter: FilterQuery<T>): this {
		const mappedFilter = this.mapFilter(filter)
		Object.assign(this.filterAccumulator, mappedFilter)
		return this
	}

	/**
	 * Add additional AND conditions
	 */
	and(filter: FilterQuery<T>): this {
		const mappedFilter = this.mapFilter(filter)
		if (!this.filterAccumulator.$and) {
			this.filterAccumulator.$and = []
		}
		this.filterAccumulator.$and.push(mappedFilter)
		return this
	}

	/**
	 * Add OR conditions
	 */
	or(filters: FilterQuery<T>[]): this {
		this.filterAccumulator.$or = filters.map((f) => this.mapFilter(f))
		return this
	}

	/**
	 * Sort results by specified fields
	 */
	sort(sort: SortQuery<T>): this {
		this.sortSpec = sort
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
		this.projectionSpec = projection
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
		try {
			const model = await this.resolveModel()
			let query = model.find(this.filterAccumulator)

			if (Object.keys(this.sortSpec).length > 0) {
				query = query.sort(this.sortSpec as Record<string, 1 | -1>)
			}

			if (this.limitValue !== undefined) {
				query = query.limit(this.limitValue)
			}

			if (this.skipValue !== undefined) {
				query = query.skip(this.skipValue)
			}

			if (Object.keys(this.projectionSpec).length > 0) {
				query = query.select(this.projectionSpec as Record<string, 0 | 1>)
			}

			const results = await query.lean()
			const mappedResults = results.map((doc) => mapDocumentId<T>(doc))
			return this.applyLocale(mappedResults)
		} catch (error: unknown) {
			// Handle CastError when trying to find by id with non-ObjectId value
			if (isCastError(error) && error.path === '_id') {
				return []
			}
			throw error
		}
	}

	/**
	 * Execute the query and return a single document
	 */
	async execOne(): Promise<BaseSchema<T> | null> {
		try {
			const model = await this.resolveModel()
			let query = model.findOne(this.filterAccumulator)

			if (Object.keys(this.sortSpec).length > 0) {
				query = query.sort(this.sortSpec as Record<string, 1 | -1>)
			}

			if (this.skipValue !== undefined) {
				query = query.skip(this.skipValue)
			}

			if (Object.keys(this.projectionSpec).length > 0) {
				query = query.select(this.projectionSpec as Record<string, 0 | 1>)
			}

			const result = await query.lean()
			if (!result) return null

			const mappedResult = mapDocumentId<T>(result)
			return this.applyLocaleOne(mappedResult)
		} catch (error: unknown) {
			// Handle CastError when trying to find by id with non-ObjectId value
			if (isCastError(error) && error.path === '_id') {
				return null
			}
			throw error
		}
	}

	/**
	 * Count matching documents without fetching them
	 */
	async count(): Promise<number> {
		const model = await this.resolveModel()
		return model.countDocuments(this.filterAccumulator)
	}

	/**
	 * Check if any matching documents exist
	 */
	async exists(): Promise<boolean> {
		const model = await this.resolveModel()
		const count = await model.countDocuments(this.filterAccumulator).limit(1)
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
	 * Map filter to handle id -> _id conversion
	 */
	private mapFilter(filter: FilterQuery<T>): InternalFilter {
		return mapQueryId(filter as Partial<BaseSchema<T>>) as InternalFilter
	}

	/**
	 * Apply locale to an array of documents
	 */
	private applyLocale(docs: BaseSchema<T>[]): BaseSchema<T>[] {
		if (!this.currentLocale) return docs

		return docs.map((doc) => this.applyLocaleOne(doc))
	}

	/**
	 * Apply locale to a single document
	 */
	private applyLocaleOne(doc: BaseSchema<T>): BaseSchema<T> {
		if (!this.currentLocale) return doc

		// If document has setLocale method, apply locale
		if (doc && typeof doc === 'object' && 'setLocale' in doc) {
			const docWithLocale = doc as BaseSchema<T> & {
				setLocale: (locale: string) => BaseSchema<T>
			}
			if (typeof docWithLocale.setLocale === 'function') {
				return docWithLocale.setLocale(this.currentLocale)
			}
		}

		return doc
	}
}
