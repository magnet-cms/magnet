import { randomUUID } from 'node:crypto'
import {
	BaseSchema,
	DatabaseError,
	DocumentNotFoundError,
	Model,
	ModelCreateOptions,
	ModelUpdateOptions,
	type NativeAccess,
	type SchemaMetadata,
	type VersionDocument,
	fromDrizzleError,
	getSchemaOptions,
} from '@magnet-cms/common'
import { toCamelCase } from '@magnet-cms/utils'
import { toSnakeCase } from '@magnet-cms/utils'
import type { Type } from '@nestjs/common'
import {
	and,
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

import { getDrizzlePropsMetadata } from '~/decorators/prop.decorator'

import { DrizzleQueryBuilder } from './drizzle.query-builder'
import { DEFAULT_LOCALE, DOCUMENT_STATUS } from './schema/document.plugin'
import type { DrizzleDB } from './types'

/**
 * Type for dynamic table with columns accessible by string keys.
 * This is needed because Drizzle tables are accessed dynamically.
 *
 * Note: We use `any` for column values because Drizzle's type system
 * doesn't support dynamic column access - this is a library limitation.
 * @see https://orm.drizzle.team/docs/dynamic-query-building
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DynamicTable = PgTable & Record<string, any>

/**
 * Type for database row from query results
 */
type DatabaseRow = Record<string, unknown>

/**
 * Detect if a Drizzle DB instance is backed by SQLite (better-sqlite3).
 * SQLite can't bind Date objects — needs ISO strings.
 */
function isSQLiteDriver(db: unknown): boolean {
	const d = db as Record<string, unknown>
	return typeof d.run === 'function' && typeof d.execute !== 'function'
}

/**
 * Drizzle-orm has internal type conflicts where SQL types from different
 * import paths are incompatible ("Two different types with this name exist").
 * This type alias documents the workaround using any for SQL conditions.
 * @see https://github.com/drizzle-team/drizzle-orm/issues/1510
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleCondition = any

/**
 * Create a Drizzle Model class for a schema.
 * @internal
 */
export function createModel<T>(
	db: DrizzleDB,
	table: PgTable,
	schemaClass: Type,
) {
	return class DrizzleModelAdapter extends Model<T> {
		_db: DrizzleDB
		_table: PgTable
		_schemaClass: Type
		currentLocale?: string
		currentVersion?: string

		constructor() {
			super()
			this._db = db
			this._table = table
			this._schemaClass = schemaClass
		}

		/**
		 * Set the locale for subsequent operations
		 */
		locale(locale: string): this {
			const clone = Object.create(Object.getPrototypeOf(this))
			Object.assign(clone, this)
			clone.currentLocale = locale
			return clone
		}

		/**
		 * Get the current locale
		 */
		getLocale(): string {
			return this.currentLocale ?? 'en'
		}

		/**
		 * Check if versioning is enabled for this model
		 * Drizzle delegates versioning to HistoryService
		 */
		isVersioningEnabled(): boolean {
			return false
		}

		/**
		 * Create a version snapshot of a document
		 * Drizzle delegates versioning to HistoryService
		 */
		createVersion(
			_documentId: string,
			_data: Partial<T>,
		): Promise<VersionDocument | null> {
			// Versions are managed by HistoryService in core
			return Promise.resolve(null)
		}

		/**
		 * Set the version for subsequent operations
		 */
		version(versionId: string): this {
			const clone = Object.create(Object.getPrototypeOf(this))
			Object.assign(clone, this)
			clone.currentVersion = versionId
			return clone
		}

		/**
		 * Create a new document
		 */
		async create(
			data: Partial<BaseSchema<T>>,
			options?: ModelCreateOptions,
		): Promise<BaseSchema<T>> {
			try {
				const dynamicTable = this._table as DynamicTable

				// Prepare insert data
				const insertData: Record<string, unknown> = {
					...this._prepareData(data, true),
				}
				this._applyDeclaredEmptyArrayDefaults(insertData)

				// Add document fields if table has them
				if ('documentId' in dynamicTable) {
					insertData.documentId = insertData.documentId || randomUUID()
					insertData.locale =
						insertData.locale || this.currentLocale || DEFAULT_LOCALE
					insertData.status = insertData.status || DOCUMENT_STATUS.DRAFT
				}

				const result = (await (this._db as DrizzleDB & { insert: Function })
					.insert(this._table)
					.values(insertData)
					.returning()) as DatabaseRow[]

				if (!result || result.length === 0) {
					throw new DatabaseError(
						'Insert failed - no result returned',
						undefined,
						{
							schema: this._schemaClass.name,
							operation: 'create',
						},
					)
				}

				const firstResult = result[0]
				if (!firstResult) {
					throw new DatabaseError(
						'Insert failed - no result returned',
						undefined,
						{
							schema: this._schemaClass.name,
							operation: 'create',
						},
					)
				}

				return this._mapResult(firstResult)
			} catch (error: unknown) {
				// Convert Drizzle/PostgreSQL errors to typed MagnetErrors
				throw fromDrizzleError(error, {
					schema: this._schemaClass.name,
					operation: 'create',
				})
			}
		}

		/**
		 * Find all documents
		 */
		async find(): Promise<BaseSchema<T>[]> {
			const dynamicTable = this._table as DynamicTable
			const dbWithSelect = this._db as DrizzleDB & { select: Function }
			const conditions: DrizzleCondition[] = []

			// Apply locale filter if set and table supports it
			if (this.currentLocale && 'locale' in dynamicTable) {
				conditions.push(eq(dynamicTable.locale, this.currentLocale))
			}

			// Apply version/status filter if set
			if (this.currentVersion && 'status' in dynamicTable) {
				if (['draft', 'published', 'archived'].includes(this.currentVersion)) {
					conditions.push(eq(dynamicTable.status, this.currentVersion))
				}
			}

			const query = dbWithSelect.select().from(this._table)
			const whereCondition: DrizzleCondition =
				conditions.length > 0 ? and(...conditions) : undefined

			const results = (await (whereCondition
				? query.where(whereCondition)
				: query)) as DatabaseRow[]

			return results.map((row) => this._mapResult(row))
		}

		/**
		 * Find a document by ID
		 */
		async findById(id: string): Promise<BaseSchema<T> | null> {
			try {
				const dynamicTable = this._table as DynamicTable
				const dbWithSelect = this._db as DrizzleDB & { select: Function }
				const conditions: DrizzleCondition[] = [eq(dynamicTable.id, id)]

				// Apply locale filter if set
				if (this.currentLocale && 'locale' in dynamicTable) {
					conditions.push(eq(dynamicTable.locale, this.currentLocale))
				}

				// Apply version/status filter if set
				if (this.currentVersion && 'status' in dynamicTable) {
					if (
						['draft', 'published', 'archived'].includes(this.currentVersion)
					) {
						conditions.push(eq(dynamicTable.status, this.currentVersion))
					}
				}

				const whereCondition: DrizzleCondition = and(...conditions)
				const results = (await dbWithSelect
					.select()
					.from(this._table)
					.where(whereCondition)
					.limit(1)) as DatabaseRow[]

				if (!results || results.length === 0) {
					return null
				}

				const firstResult = results[0]
				if (!firstResult) {
					return null
				}

				return this._mapResult(firstResult)
			} catch {
				// Return null for invalid ID format (e.g., non-UUID on UUID columns)
				return null
			}
		}

		/**
		 * Find a single document matching the query
		 */
		async findOne(
			query: Partial<BaseSchema<T>>,
		): Promise<BaseSchema<T> | null> {
			try {
				const dynamicTable = this._table as DynamicTable
				const dbWithSelect = this._db as DrizzleDB & { select: Function }
				const conditions: DrizzleCondition[] = this._buildConditions(query)

				// Apply locale filter if set
				if (this.currentLocale && 'locale' in dynamicTable) {
					conditions.push(eq(dynamicTable.locale, this.currentLocale))
				}

				// Apply version/status filter if set
				if (this.currentVersion && 'status' in dynamicTable) {
					if (
						['draft', 'published', 'archived'].includes(this.currentVersion)
					) {
						conditions.push(eq(dynamicTable.status, this.currentVersion))
					}
				}

				const whereCondition: DrizzleCondition =
					conditions.length > 0 ? and(...conditions) : undefined
				const results = (await dbWithSelect
					.select()
					.from(this._table)
					.where(whereCondition)
					.limit(1)) as DatabaseRow[]

				if (!results || results.length === 0) {
					return null
				}

				const firstResult = results[0]
				if (!firstResult) {
					return null
				}

				return this._mapResult(firstResult)
			} catch {
				// Return null for invalid query values (e.g., non-UUID on UUID columns)
				return null
			}
		}

		/**
		 * Find multiple documents matching the query
		 */
		async findMany(query: Partial<BaseSchema<T>>): Promise<BaseSchema<T>[]> {
			const dynamicTable = this._table as DynamicTable
			const dbWithSelect = this._db as DrizzleDB & { select: Function }
			const conditions: DrizzleCondition[] = this._buildConditions(query)

			// Apply locale filter if set
			if (this.currentLocale && 'locale' in dynamicTable) {
				conditions.push(eq(dynamicTable.locale, this.currentLocale))
			}

			// Apply version/status filter if set
			if (this.currentVersion && 'status' in dynamicTable) {
				if (['draft', 'published', 'archived'].includes(this.currentVersion)) {
					conditions.push(eq(dynamicTable.status, this.currentVersion))
				}
			}

			const whereCondition: DrizzleCondition =
				conditions.length > 0 ? and(...conditions) : undefined
			const results = (await dbWithSelect
				.select()
				.from(this._table)
				.where(whereCondition)) as DatabaseRow[]

			return results.map((row) => this._mapResult(row))
		}

		/**
		 * Update a document
		 */
		async update(
			query: Partial<BaseSchema<T>>,
			data: Partial<BaseSchema<T>>,
			options?: ModelUpdateOptions,
		): Promise<BaseSchema<T>> {
			const conditions: DrizzleCondition[] = this._buildConditions(query)
			const dbWithUpdate = this._db as DrizzleDB & { update: Function }

			if (conditions.length === 0) {
				throw new Error('Update requires at least one condition')
			}

			const updateData = this._prepareData(data)
			updateData.updatedAt = new Date()

			const whereCondition: DrizzleCondition = and(...conditions)
			const results = (await dbWithUpdate
				.update(this._table)
				.set(updateData)
				.where(whereCondition)
				.returning()) as DatabaseRow[]

			if (!results || results.length === 0) {
				throw new DocumentNotFoundError(this._schemaClass.name, 'unknown', {
					operation: 'update',
				})
			}

			const firstResult = results[0]
			if (!firstResult) {
				throw new DocumentNotFoundError(this._schemaClass.name, 'unknown', {
					operation: 'update',
				})
			}

			return this._mapResult(firstResult)
		}

		/**
		 * Delete a document
		 */
		async delete(query: Partial<BaseSchema<T>>): Promise<boolean> {
			const conditions: DrizzleCondition[] = this._buildConditions(query)
			const dbWithDelete = this._db as DrizzleDB & { delete: Function }

			if (conditions.length === 0) {
				throw new Error('Delete requires at least one condition')
			}

			const whereCondition: DrizzleCondition = and(...conditions)
			const results = (await dbWithDelete
				.delete(this._table)
				.where(whereCondition)
				.returning()) as DatabaseRow[]

			return results && results.length > 0
		}

		/**
		 * Find all versions of a document
		 */
		async findVersions(documentId: string): Promise<VersionDocument[]> {
			// Versions are managed by HistoryService in core
			return []
		}

		/**
		 * Find a specific version by ID
		 */
		async findVersionById(versionId: string): Promise<VersionDocument | null> {
			// Versions are managed by HistoryService in core
			return null
		}

		/**
		 * Restore a version
		 */
		async restoreVersion(versionId: string): Promise<BaseSchema<T> | null> {
			// Versions are managed by HistoryService in core
			return null
		}

		/**
		 * Create a query builder for advanced queries
		 */
		query(): DrizzleQueryBuilder<T> {
			return new DrizzleQueryBuilder<T>(
				this._db,
				this._table,
				this.currentLocale,
				this.currentVersion,
			)
		}

		/**
		 * Get access to the native Drizzle db and table
		 */
		native(): NativeAccess<T> {
			const db = this._db
			const table = this._table
			return {
				raw: { db, table },
				adapterName: 'drizzle',
				async rawQuery<R = unknown>(
					query: string,
					_params?: unknown[],
				): Promise<R> {
					// Execute raw SQL query
					// Note: params should be embedded in the query string for raw SQL
					// Use type assertion to work around Drizzle's internal SQL type conflicts
					// @see https://github.com/drizzle-team/drizzle-orm/issues/1510
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const result = await (db as any).execute(sql.raw(query))
					return result as R
				},
			}
		}

		/**
		 * Get schema name
		 */
		getSchemaName(): string {
			return this._schemaClass.name
		}

		/**
		 * Get schema metadata
		 */
		getMetadata(): SchemaMetadata {
			const options = getSchemaOptions(this._schemaClass)
			const dynamicTable = this._table as DynamicTable

			// Build properties from table columns
			const properties: SchemaMetadata['properties'] = []
			for (const [key, column] of Object.entries(dynamicTable)) {
				// Skip non-column entries
				if (
					typeof column !== 'object' ||
					column === null ||
					!('dataType' in column)
				) {
					continue
				}

				properties.push({
					name: key,
					type: String((column as { dataType?: string }).dataType || 'unknown'),
					isArray: false,
					unique: false,
					required: (column as { notNull?: boolean }).notNull === true,
					validations: [],
					ui: { tab: 'General', type: 'text' },
				})
			}

			return {
				name: this._schemaClass.name.toLowerCase(),
				className: this._schemaClass.name,
				properties,
				options,
			}
		}

		/**
		 * Build conditions array from a query object.
		 * Supports MongoDB-style operators ($regex, $in, $or, $and, etc.)
		 * @internal
		 */
		_buildConditions(query: Partial<BaseSchema<T>>): DrizzleCondition[] {
			const dynamicTable = this._table as DynamicTable
			const conditions: DrizzleCondition[] = []

			for (const [key, value] of Object.entries(query)) {
				// Handle $and logical operator
				if (key === '$and' && Array.isArray(value)) {
					const andConds = value
						.flatMap((f) => this._buildConditions(f as Partial<BaseSchema<T>>))
						.filter((c): c is NonNullable<typeof c> => c !== undefined)
					if (andConds.length > 0) conditions.push(and(...andConds))
					continue
				}

				// Handle $or logical operator
				if (key === '$or' && Array.isArray(value)) {
					const orConds = value
						.map((f) => {
							const conds = this._buildConditions(
								f as Partial<BaseSchema<T>>,
							).filter((c): c is NonNullable<typeof c> => c !== undefined)
							return conds.length > 1 ? and(...conds) : conds[0]
						})
						.filter((c): c is NonNullable<typeof c> => c !== undefined)
					if (orConds.length > 0) conditions.push(or(...orConds))
					continue
				}

				// Resolve column: try camelCase key first, then snake_case
				const column = dynamicTable[key] || dynamicTable[toSnakeCase(key)]
				if (!column || typeof column !== 'object') continue

				// Handle operator objects like { $regex: 'x', $in: [...] }
				if (
					value !== null &&
					typeof value === 'object' &&
					!Array.isArray(value)
				) {
					const ops = value as Record<string, unknown>
					// Check if it's an operator object (has $ keys)
					const hasOperators = Object.keys(ops).some((k) => k.startsWith('$'))
					if (hasOperators) {
						for (const [op, opVal] of Object.entries(ops)) {
							if (op === '$options') continue
							const cond = this._mapOperator(column, op, opVal)
							if (cond) conditions.push(cond)
						}
						continue
					}
				}

				// Simple equality
				conditions.push(eq(column, value))
			}

			return conditions
		}

		/**
		 * Map a MongoDB-style operator to a Drizzle condition
		 * @internal
		 */
		_mapOperator(
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
					return undefined
			}
		}

		/**
		 * Map a database row to a result with camelCase keys
		 * @internal
		 */
		_mapResult(row: DatabaseRow): BaseSchema<T> {
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
				} else if (typeof value === 'string') {
					// Try to parse JSON/array strings from text columns
					// PostgreSQL array literals: {"a","b"} or text columns storing JSON
					if (
						(value.startsWith('[') && value.endsWith(']')) ||
						(value.startsWith('{') && value.endsWith('}'))
					) {
						try {
							// Try JSON parse first
							result[camelKey] = JSON.parse(value)
						} catch {
							// Try PostgreSQL array literal: {"a","b","c"}
							if (value.startsWith('{') && value.endsWith('}')) {
								try {
									// Convert PG array literal to JSON array
									const jsonStr = `[${value.slice(1, -1).replace(/"/g, '"')}]`
									const parsed = JSON.parse(jsonStr)
									result[camelKey] = parsed
								} catch {
									result[camelKey] = value
								}
							} else {
								result[camelKey] = value
							}
						}
					} else {
						result[camelKey] = value
					}
				} else {
					result[camelKey] = value
				}
			}

			return result as BaseSchema<T>
		}

		/**
		 * Prepare data for insert/update by filtering out id field
		 * Note: We keep camelCase keys because Drizzle column definitions use camelCase keys
		 * and Drizzle handles the snake_case conversion internally based on column names
		 * For JSONB columns (arrays/objects), ensure values are properly formatted
		 * @internal
		 */
		/**
		 * Fields declared with `default: []` omit a DB default (cross-dialect migration/runtime).
		 * Fill missing keys so inserts match Mongoose-style expectations.
		 */
		_applyDeclaredEmptyArrayDefaults(row: Record<string, unknown>): void {
			const props = getDrizzlePropsMetadata(this._schemaClass)
			for (const [propertyKey, options] of props) {
				const key = String(propertyKey)
				if (
					options.default !== undefined &&
					Array.isArray(options.default) &&
					options.default.length === 0 &&
					row[key] === undefined
				) {
					row[key] = isSQLiteDriver(this._db) ? JSON.stringify([]) : []
				}
			}
		}

		_prepareData(
			data: Record<string, unknown>,
			isCreate = false,
		): Record<string, unknown> {
			const result: Record<string, unknown> = {}
			const isSQLite = isSQLiteDriver(this._db)

			// Ensure createdAt is set on new records so it never relies on a
			// potentially-missing DB-level default (e.g. when the column was
			// originally migrated without DEFAULT NOW()).
			if (isCreate) {
				result.createdAt =
					data.createdAt instanceof Date ? data.createdAt : new Date()
			}

			// Always set updatedAt on every write
			result.updatedAt =
				data.updatedAt instanceof Date ? data.updatedAt : new Date()

			for (const [key, value] of Object.entries(data)) {
				if (key === 'id') continue // Skip id, it's auto-generated
				if (key === 'createdAt' || key === 'updatedAt') continue // Handled above

				if (value === undefined) {
					// Skip undefined - let database defaults handle it
					continue
				}
				// Allow explicit null values (e.g., publishedAt: null for drafts)
				if (value === null) {
					result[key] = null
					continue
				}

				// SQLite: convert booleans to 0/1 (SQLite can't bind true/false)
				if (typeof value === 'boolean' && isSQLite) {
					result[key] = value ? 1 : 0
					continue
				}

				// Handle Date objects - ensure they're Date instances (not strings)
				// Drizzle's mapToDriverValue handles Date→string conversion per dialect
				if (value instanceof Date) {
					result[key] = value
					continue
				}

				// Convert ISO date strings to Date objects for timestamp columns
				if (
					typeof value === 'string' &&
					/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
				) {
					const dateValue = new Date(value)
					if (!Number.isNaN(dateValue.getTime())) {
						result[key] = dateValue
						continue
					}
				}

				// Handle JSONB values: if value is a string that looks like JSON, parse it
				// This handles cases where JSON strings might be passed instead of objects/arrays
				if (
					typeof value === 'string' &&
					(value.trim().startsWith('[') || value.trim().startsWith('{'))
				) {
					try {
						result[key] = JSON.parse(value)
					} catch {
						// If parsing fails, it's probably a regular string, pass as-is
						result[key] = value
					}
				} else if (Array.isArray(value)) {
					// SQLite + pg-core JSON columns: binding `[]` can mismatch placeholders; use a JSON string.
					result[key] = isSQLite ? JSON.stringify(value) : value
				} else if (value !== null && typeof value === 'object') {
					// For objects, pass as-is - Drizzle will serialize for JSONB
					result[key] = value
				} else {
					// For primitives, pass as-is
					result[key] = value
				}
			}

			return result
		}
	}
}
