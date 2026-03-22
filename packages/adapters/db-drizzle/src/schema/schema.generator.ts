import { randomUUID } from 'node:crypto'
import {
	PropOptions,
	getFieldMetadata,
	getSchemaOptions,
	mapFieldTypeToProp,
} from '@magnet-cms/common'
import { pluralize, toSnakeCase } from '@magnet-cms/utils'
import type { Type } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import {
	boolean,
	doublePrecision,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core'
import { getDrizzlePropsMetadata } from '~/decorators/prop.decorator'
import { DocumentColumnOptions, applyDocumentColumns } from './document.plugin'

/**
 * Registry of generated Drizzle schemas
 */
const schemaRegistry = new Map<string, any>()

/**
 * Get or generate a Drizzle table schema from a class
 */
export function getOrGenerateSchema(schemaClass: Type): {
	table: ReturnType<typeof pgTable>
	tableName: string
} {
	const className = schemaClass.name

	if (schemaRegistry.has(className)) {
		return schemaRegistry.get(className)
	}

	const generated = generateSchema(schemaClass)
	schemaRegistry.set(className, generated)
	return generated
}

/**
 * Generate a Drizzle table schema from a decorated class
 */
export function generateSchema(schemaClass: Type): {
	table: ReturnType<typeof pgTable>
	tableName: string
} {
	const schemaOptions = getSchemaOptions(schemaClass)
	let propsMetadata = getDrizzlePropsMetadata(schemaClass)

	// Fallback: if no Drizzle-specific prop metadata was registered (e.g., applyAdapterProp
	// in @magnet-cms/common silently failed because the adapter was not yet detected),
	// rebuild props from the @Field.* metadata which is always stored by @magnet-cms/common.
	if (propsMetadata.size === 0) {
		const fieldMeta = getFieldMetadata(schemaClass)
		if (fieldMeta.length > 0) {
			propsMetadata = new Map(
				fieldMeta.map((field) => [
					field.propertyKey,
					mapFieldTypeToProp(field.type, field.options),
				]),
			)
		}
	}

	// Generate table name (lowercase pluralized class name)
	const tableName = pluralize(schemaClass.name.toLowerCase())

	// Check if i18n or versioning is enabled
	const hasI18n = schemaOptions.i18n !== false
	const hasVersioning = schemaOptions.versioning !== false

	// Check for any intl properties
	let hasIntlProps = false
	propsMetadata.forEach((options) => {
		if (options.intl) {
			hasIntlProps = true
		}
	})

	// Build columns object
	const columns: Record<string, any> = {
		// Primary key - always UUID
		// $defaultFn generates UUIDs in JS (works on all dialects: PostgreSQL, MySQL, SQLite)
		// Note: SQL .default(gen_random_uuid()) is intentionally omitted because it conflicts
		// with $defaultFn when using pg-core types on non-PostgreSQL drivers.
		// The createTableFromConfig() method adds dialect-appropriate SQL DEFAULT for direct inserts.
		id: uuid('id')
			.primaryKey()
			.$defaultFn(() => randomUUID()),
	}

	// Add document columns for i18n/versioning if enabled
	if (hasI18n || hasVersioning || hasIntlProps) {
		const docOptions: DocumentColumnOptions = {
			hasI18n: hasI18n || hasIntlProps,
			hasVersioning,
		}
		Object.assign(columns, applyDocumentColumns(docOptions))
	}

	// Add columns for each property
	propsMetadata.forEach((options, propertyKey) => {
		const columnName = String(propertyKey)
		const column = generateColumn(columnName, options)
		if (column) {
			columns[columnName] = column
		}
	})

	// Add timestamps — SQL .defaultNow() omitted for cross-dialect compatibility.
	// The model layer (_prepareData) sets createdAt/updatedAt as JS Date objects,
	// and serializes them to ISO strings for SQLite compatibility.
	columns.createdAt = timestamp('created_at').notNull()
	columns.updatedAt = timestamp('updated_at').notNull()

	// Create the table with indexes
	const table = pgTable(tableName, columns, (table) => {
		const tableIndexes: Record<string, any> = {}
		const t = table as any

		// Add compound unique index for document-based i18n if enabled
		if (hasI18n || hasIntlProps) {
			tableIndexes.documentLocaleStatusIdx = uniqueIndex(
				`${tableName}_document_locale_status_idx`,
			).on(t.documentId, t.locale, t.status)

			tableIndexes.documentLocaleIdx = index(
				`${tableName}_document_locale_idx`,
			).on(t.documentId, t.locale)

			tableIndexes.statusLocaleIdx = index(`${tableName}_status_locale_idx`).on(
				t.status,
				t.locale,
			)
		}

		// Add unique indexes for unique properties
		propsMetadata.forEach((options, propertyKey) => {
			if (options.unique) {
				const columnName = String(propertyKey)
				if (hasI18n || hasIntlProps) {
					// Partial unique index for i18n (only on default locale + draft)
					// Type assertion needed due to drizzle-orm type system seeing SQL types as incompatible
					const whereCondition = and(
						eq(t.locale, 'en'),
						eq(t.status, 'draft'),
					) as any
					tableIndexes[`${columnName}UniqueI18n`] = uniqueIndex(
						`${tableName}_${columnName}_unique_i18n`,
					)
						.on(t[columnName])
						.where(whereCondition)
				} else {
					tableIndexes[`${columnName}Unique`] = uniqueIndex(
						`${tableName}_${columnName}_unique`,
					).on(t[columnName])
				}
			}
		})

		return tableIndexes
	})

	return { table, tableName }
}

/**
 * Generate a Drizzle column from property options
 */
function generateColumn(columnName: string, options: PropOptions): any {
	const snakeCaseName = toSnakeCase(columnName)
	let column: any

	// Determine column type based on type option or design:type
	const type = options.type

	if (type === String || type === undefined) {
		column = text(snakeCaseName)
	} else if (type === Number) {
		// Use double precision for numbers (covers both int and float)
		column = doublePrecision(snakeCaseName)
	} else if (type === Boolean) {
		column = boolean(snakeCaseName)
	} else if (type === Date) {
		column = timestamp(snakeCaseName)
	} else if (Array.isArray(type) || type === Array) {
		// Arrays stored as JSONB
		column = jsonb(snakeCaseName)
	} else if (typeof type === 'object') {
		// Objects stored as JSONB
		column = jsonb(snakeCaseName)
	} else if (options.ref) {
		// References are stored as UUIDs
		column = uuid(snakeCaseName)
	} else {
		// Default to text for unknown types
		column = text(snakeCaseName)
	}

	// `required` is an application-level concern validated on publish,
	// NOT a database constraint. Drafts start empty and get filled via
	// auto-save; NOT NULL would prevent creating empty drafts.
	// System columns (id, documentId, locale, status, timestamps) set
	// notNull directly in generateSchema(), not here.

	if (options.default !== undefined) {
		// `column.default([])` makes drizzle-kit emit invalid SQL (`DEFAULT ,`).
		// `sql\`[]::jsonb\`` breaks SQLite inserts with pg-core + better-sqlite3 (placeholder mismatch).
		// Omit a DB default; callers / `create()` merge empty arrays from field metadata when needed.
		if (Array.isArray(options.default) && options.default.length === 0) {
			// intentionally no .default()
		} else {
			column = column.default(options.default)
		}
	}

	return column
}

/**
 * Get all registered schemas (read-only view of the registry)
 */
export function getRegisteredSchemas(): ReadonlyMap<
	string,
	{ table: ReturnType<typeof pgTable>; tableName: string }
> {
	return schemaRegistry as ReadonlyMap<
		string,
		{ table: ReturnType<typeof pgTable>; tableName: string }
	>
}

/**
 * Clear the schema registry (useful for testing)
 */
export function clearSchemaRegistry(): void {
	schemaRegistry.clear()
}
