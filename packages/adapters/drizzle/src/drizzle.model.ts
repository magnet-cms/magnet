import {
	BaseSchema,
	Model,
	ModelCreateOptions,
	ModelUpdateOptions,
	ValidationException,
} from '@magnet-cms/common'
import type { Type } from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'

import { DrizzleQueryBuilder } from './drizzle.query-builder'
import { DEFAULT_LOCALE, DOCUMENT_STATUS } from './schema/document.plugin'
import type { DrizzleDB } from './types'

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
		getLocale(): string | undefined {
			return this.currentLocale
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
				const tableAny = this._table as any

				// Prepare insert data
				const insertData: Record<string, any> = {
					...this._prepareData(data),
				}

				// Add document fields if table has them
				if ('documentId' in tableAny) {
					insertData.documentId =
						insertData.documentId || sql`gen_random_uuid()`
					insertData.locale =
						insertData.locale || this.currentLocale || DEFAULT_LOCALE
					insertData.status = insertData.status || DOCUMENT_STATUS.DRAFT
				}

				const result = await (this._db as any)
					.insert(this._table)
					.values(insertData)
					.returning()

				if (!result || result.length === 0) {
					throw new Error('Insert failed - no result returned')
				}

				return this._mapResult(result[0])
			} catch (error: any) {
				// Handle PostgreSQL unique constraint violations
				if (error.code === '23505') {
					const match = error.detail?.match(/Key \((.+?)\)/)
					const property = match ? match[1] : 'unknown'

					throw new ValidationException([
						{
							property,
							constraints: {
								[property]: `${property} already exists`,
							},
						},
					])
				}

				throw error
			}
		}

		/**
		 * Find all documents
		 */
		async find(): Promise<BaseSchema<T>[]> {
			const tableAny = this._table as any
			let query = (this._db as any).select().from(this._table)

			// Apply locale filter if set and table supports it
			if (this.currentLocale && 'locale' in tableAny) {
				query = query.where(eq(tableAny.locale, this.currentLocale))
			}

			// Apply version/status filter if set
			if (this.currentVersion && 'status' in tableAny) {
				if (['draft', 'published', 'archived'].includes(this.currentVersion)) {
					query = query.where(eq(tableAny.status, this.currentVersion))
				}
			}

			const results = await query

			return results.map((row: any) => this._mapResult(row))
		}

		/**
		 * Find a document by ID
		 */
		async findById(id: string): Promise<BaseSchema<T> | null> {
			const tableAny = this._table as any
			const conditions = [eq(tableAny.id, id)]

			// Apply locale filter if set
			if (this.currentLocale && 'locale' in tableAny) {
				conditions.push(eq(tableAny.locale, this.currentLocale))
			}

			// Apply version/status filter if set
			if (this.currentVersion && 'status' in tableAny) {
				if (['draft', 'published', 'archived'].includes(this.currentVersion)) {
					conditions.push(eq(tableAny.status, this.currentVersion))
				}
			}

			const results = await (this._db as any)
				.select()
				.from(this._table)
				.where(and(...conditions))
				.limit(1)

			if (!results || results.length === 0) {
				return null
			}

			return this._mapResult(results[0])
		}

		/**
		 * Find a single document matching the query
		 */
		async findOne(
			query: Partial<BaseSchema<T>>,
		): Promise<BaseSchema<T> | null> {
			const tableAny = this._table as any
			const conditions = this._buildConditions(query)

			// Apply locale filter if set
			if (this.currentLocale && 'locale' in tableAny) {
				conditions.push(eq(tableAny.locale, this.currentLocale))
			}

			// Apply version/status filter if set
			if (this.currentVersion && 'status' in tableAny) {
				if (['draft', 'published', 'archived'].includes(this.currentVersion)) {
					conditions.push(eq(tableAny.status, this.currentVersion))
				}
			}

			const results = await (this._db as any)
				.select()
				.from(this._table)
				.where(conditions.length > 0 ? and(...conditions) : undefined)
				.limit(1)

			if (!results || results.length === 0) {
				return null
			}

			return this._mapResult(results[0])
		}

		/**
		 * Find multiple documents matching the query
		 */
		async findMany(query: Partial<BaseSchema<T>>): Promise<BaseSchema<T>[]> {
			const tableAny = this._table as any
			const conditions = this._buildConditions(query)

			// Apply locale filter if set
			if (this.currentLocale && 'locale' in tableAny) {
				conditions.push(eq(tableAny.locale, this.currentLocale))
			}

			// Apply version/status filter if set
			if (this.currentVersion && 'status' in tableAny) {
				if (['draft', 'published', 'archived'].includes(this.currentVersion)) {
					conditions.push(eq(tableAny.status, this.currentVersion))
				}
			}

			const results = await (this._db as any)
				.select()
				.from(this._table)
				.where(conditions.length > 0 ? and(...conditions) : undefined)

			return results.map((row: any) => this._mapResult(row))
		}

		/**
		 * Update a document
		 */
		async update(
			query: Partial<BaseSchema<T>>,
			data: Partial<BaseSchema<T>>,
			options?: ModelUpdateOptions,
		): Promise<BaseSchema<T>> {
			const conditions = this._buildConditions(query)

			if (conditions.length === 0) {
				throw new Error('Update requires at least one condition')
			}

			const updateData = this._prepareData(data)
			updateData.updatedAt = new Date()

			const results = await (this._db as any)
				.update(this._table)
				.set(updateData)
				.where(and(...conditions))
				.returning()

			if (!results || results.length === 0) {
				throw new Error('Document not found')
			}

			return this._mapResult(results[0])
		}

		/**
		 * Delete a document
		 */
		async delete(query: Partial<BaseSchema<T>>): Promise<boolean> {
			const conditions = this._buildConditions(query)

			if (conditions.length === 0) {
				throw new Error('Delete requires at least one condition')
			}

			const results = await (this._db as any)
				.delete(this._table)
				.where(and(...conditions))
				.returning()

			return results && results.length > 0
		}

		/**
		 * Find all versions of a document
		 */
		async findVersions(documentId: string): Promise<any[]> {
			// Versions are managed by HistoryService in core
			return []
		}

		/**
		 * Find a specific version by ID
		 */
		async findVersionById(versionId: string): Promise<any | null> {
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
		native(): { db: DrizzleDB; table: PgTable } {
			return { db: this._db, table: this._table }
		}

		/**
		 * Build conditions array from a query object
		 * @internal
		 */
		_buildConditions(query: Partial<BaseSchema<T>>): any[] {
			const tableAny = this._table as any
			const conditions: any[] = []

			for (const [key, value] of Object.entries(query)) {
				// Try camelCase first (matches table column definitions)
				if (key in tableAny) {
					conditions.push(eq(tableAny[key], value))
				}
			}

			return conditions
		}

		/**
		 * Map a database row to a result with camelCase keys
		 * @internal
		 */
		_mapResult(row: any): BaseSchema<T> {
			const result: Record<string, any> = {}

			for (const [key, value] of Object.entries(row)) {
				const camelKey = this._toCamelCase(key)

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
		 * Prepare data for insert/update by filtering out id field
		 * Note: We keep camelCase keys because Drizzle column definitions use camelCase keys
		 * and Drizzle handles the snake_case conversion internally based on column names
		 * For JSONB columns (arrays/objects), ensure values are properly formatted
		 * @internal
		 */
		_prepareData(data: Record<string, any>): Record<string, any> {
			const result: Record<string, any> = {}

			for (const [key, value] of Object.entries(data)) {
				if (key === 'id') continue // Skip id, it's auto-generated
				if (key === 'createdAt') continue // Skip createdAt - let database use default

				if (value === undefined || value === null) {
					// Skip undefined/null - let database defaults handle it
					continue
				}

				// Handle Date objects - ensure they're Date instances (not strings)
				// Drizzle expects Date objects for timestamp columns
				if (value instanceof Date) {
					result[key] = value
					continue
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
					// For arrays, pass as-is - Drizzle will automatically serialize arrays/objects for JSONB columns
					result[key] = value
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

		/**
		 * Convert snake_case to camelCase
		 * @internal
		 */
		_toCamelCase(str: string): string {
			return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
		}
	}
}
