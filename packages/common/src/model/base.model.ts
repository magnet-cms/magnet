import type { QueryBuilder } from './query-builder'

export type BaseSchema<T> = { id: string } & T

export abstract class Model<Schema> {
	abstract create(
		data: Partial<BaseSchema<Schema>>,
	): Promise<BaseSchema<Schema>>
	abstract find(): Promise<BaseSchema<Schema>[]>
	abstract findById(id: string): Promise<BaseSchema<Schema> | null>
	abstract findOne(
		query: Partial<BaseSchema<Schema>>,
	): Promise<BaseSchema<Schema> | null>
	abstract findMany(
		query: Partial<BaseSchema<Schema>>,
	): Promise<BaseSchema<Schema>[]>
	abstract update(
		query: Partial<BaseSchema<Schema>>,
		data: Partial<BaseSchema<Schema>>,
	): Promise<BaseSchema<Schema>>
	abstract delete(query: Partial<BaseSchema<Schema>>): Promise<boolean>

	/**
	 * Set the locale for subsequent operations
	 * @param locale The locale to use
	 */
	abstract locale(locale: string): this

	/**
	 * Set the version for subsequent operations
	 * @param versionId The version ID or status ('draft', 'published', 'archived')
	 */
	version(versionId: string): this {
		// This is a base implementation that will be overridden by adapters
		return this
	}

	/**
	 * Find all versions of a document
	 * @param documentId The document ID
	 */
	findVersions(documentId: string): Promise<any[]> {
		// This is a base implementation that will be overridden by adapters
		return Promise.resolve([])
	}

	/**
	 * Find a specific version by ID
	 * @param versionId The version ID
	 */
	findVersionById(versionId: string): Promise<any | null> {
		// This is a base implementation that will be overridden by adapters
		return Promise.resolve(null)
	}

	/**
	 * Restore a version
	 * @param versionId The version ID to restore
	 */
	restoreVersion(versionId: string): Promise<BaseSchema<Schema> | null> {
		// This is a base implementation that will be overridden by adapters
		return Promise.resolve(null)
	}

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

	/**
	 * Get access to the native database model/collection.
	 * Use with caution - bypasses Magnet abstractions like locale and versioning.
	 *
	 * @returns The underlying database model (e.g., Mongoose Model)
	 */
	native(): unknown {
		throw new Error('Native access not implemented by this adapter')
	}
}
