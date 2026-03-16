import {
	type AdapterCapabilities,
	type AdapterFeature,
	type AdapterName,
	DatabaseAdapter,
	MagnetModuleOptions,
	getModelToken,
} from '@magnet-cms/common'
import { DynamicModule, Injectable, Logger, Module, Type } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { type PgTable, getTableConfig } from 'drizzle-orm/pg-core'
import { Pool } from 'pg'

import { createNeonWebSocketConnection } from './dialects/neon'
import { createModel } from './drizzle.model'
import { LazyQueryBuilder } from './drizzle.query-builder'
import { AutoMigration } from './migrations/auto-migration'
import { MigrationGenerator } from './migrations/migration-generator'
import { MigrationRunner } from './migrations/migration-runner'
import { SchemaBridge } from './migrations/schema-bridge'
import { SchemaDiff } from './migrations/schema-diff'
import { DEFAULT_MIGRATION_CONFIG } from './migrations/types'
import type { MigrationDb } from './migrations/types'
import { getOrGenerateSchema } from './schema/schema.generator'
import type { DrizzleConfig, DrizzleDB } from './types'

/**
 * Injection tokens
 */
export const DRIZZLE_DB = 'DRIZZLE_DB'
export const DRIZZLE_CONFIG = 'DRIZZLE_CONFIG'

/**
 * Get model token for a schema
 * @deprecated Use getModelToken from @magnet-cms/common instead
 */
export function getDrizzleModelToken(schema: string): string {
	return getModelToken(schema)
}

/**
 * Empty module for dynamic module structure
 */
@Module({})
class DrizzleModule {}

@Module({})
class DrizzleFeatureModule {}

/**
 * Drizzle ORM adapter for Magnet CMS.
 * Supports PostgreSQL, MySQL, and SQLite through Drizzle ORM.
 */
@Injectable()
class DrizzleAdapter extends DatabaseAdapter {
	readonly name: AdapterName = 'drizzle'
	private db: DrizzleDB | null = null
	private pool:
		| Pool
		| { end?: () => Promise<void>; close?: () => void }
		| null = null
	private options: MagnetModuleOptions | null = null
	private schemaRegistry: Map<string, { table: PgTable; tableName: string }> =
		new Map()
	private tablesInitialized = false

	constructor() {
		super()
	}

	/**
	 * Automatically create tables for all registered schemas.
	 * Called lazily when first model is accessed, or can be called explicitly.
	 */
	async ensureTablesCreated(): Promise<void> {
		if (this.tablesInitialized || !this.db || this.schemaRegistry.size === 0) {
			return
		}

		// Small delay to allow all schemas to be registered
		await new Promise((resolve) => setTimeout(resolve, 200))

		const drizzleConfig = this.options?.db as DrizzleConfig | undefined

		if (drizzleConfig?.migrations) {
			// Migration-aware mode: delegate to AutoMigration
			await this.runAutoMigration(drizzleConfig)
		} else {
			// Backward-compatible mode: CREATE TABLE IF NOT EXISTS
			await this.createTables()
		}

		this.tablesInitialized = true
	}

	/**
	 * Run the auto-migration system when `config.migrations` is configured.
	 */
	private async runAutoMigration(config: DrizzleConfig): Promise<void> {
		const migrationConfig = {
			...DEFAULT_MIGRATION_CONFIG,
			...config.migrations,
		}
		const migrationDb: MigrationDb = {
			execute: async (sql: string) =>
				(
					this.db as unknown as { execute: (s: unknown) => Promise<unknown> }
				).execute(sql),
		}
		const bridge = new SchemaBridge()
		const diff = new SchemaDiff(bridge)
		const gen = new MigrationGenerator()
		const runner = new MigrationRunner(migrationDb, migrationConfig)
		const auto = new AutoMigration(bridge, diff, gen, runner)

		const mode = migrationConfig.mode
		try {
			await auto.run(
				config.dialect ?? 'postgresql',
				migrationConfig,
				migrationConfig.directory,
			)
		} catch (err) {
			const msg = err instanceof Error ? err.message : JSON.stringify(err)
			const stack = err instanceof Error ? err.stack : undefined
			new Logger('DrizzleAdapter').error(
				`Auto-migration failed: ${msg}${stack ? `\n${stack}` : ''}`,
			)
			if (mode === 'auto') {
				throw err
			}
		}
	}

	/**
	 * Create tables for all registered schemas in the database.
	 * Uses Drizzle's getTableConfig to generate CREATE TABLE IF NOT EXISTS statements.
	 */
	private async createTables(): Promise<void> {
		if (!this.db || this.schemaRegistry.size === 0) {
			return
		}

		const drizzleConfig = this.options?.db as DrizzleConfig | undefined
		const dialect = drizzleConfig?.dialect ?? 'postgresql'

		try {
			for (const [, { table }] of this.schemaRegistry.entries()) {
				const config = getTableConfig(table)
				await this.createTableFromConfig(config, dialect)
			}
		} catch (error) {
			// Log error but don't fail startup - tables might already exist
			new Logger('DrizzleAdapter').warn(
				'Error creating tables automatically:',
				JSON.stringify(error),
			)
		}
	}

	/**
	 * Quote identifier for the given dialect.
	 */
	private quoteIdent(name: string, dialect: string): string {
		if (dialect === 'mysql') {
			return `\`${name.replace(/`/g, '``')}\``
		}
		return `"${name.replace(/"/g, '""')}"`
	}

	/**
	 * Generate and execute CREATE TABLE IF NOT EXISTS statement from table config.
	 */
	private async createTableFromConfig(
		config: Record<string, unknown>,
		dialect: string,
	): Promise<void> {
		if (!this.db) return

		const tableName = config.name as string
		const q = (n: string) => this.quoteIdent(n, dialect)
		const columns: string[] = []

		// Generate column definitions
		const columnsArray = Array.isArray(config.columns)
			? config.columns
			: Object.values(config.columns as Record<string, unknown>)
		for (const col of columnsArray) {
			const column = col as Record<string, unknown>
			const colName = column.name as string
			const colDef: string[] = [q(colName)]

			// Get SQL type using getSQLType() method on the column builder
			let sqlType: string
			if (typeof column.getSQLType === 'function') {
				sqlType = (column.getSQLType as () => string)()
			} else {
				sqlType =
					this.inferSQLType(column, dialect) ||
					(dialect === 'mysql' ? 'VARCHAR(255)' : 'TEXT')
			}

			// Map PostgreSQL types to dialect-specific types
			sqlType = this.mapSQLTypeForDialect(sqlType, dialect)

			colDef.push(sqlType)

			// Add NOT NULL constraint
			if (column.notNull) {
				colDef.push('NOT NULL')
			}

			// Add DEFAULT constraint
			if (column.default !== undefined) {
				const defaultValue = column.default
				const defaultSQL = this.formatDefaultValue(
					defaultValue,
					sqlType,
					dialect,
				)
				if (defaultSQL) {
					colDef.push(`DEFAULT ${defaultSQL}`)
				}
			}

			columns.push(colDef.join(' '))
		}

		// Add primary key constraint
		const primaryKeys = config.primaryKeys as string[] | undefined
		if (primaryKeys && primaryKeys.length > 0) {
			const pkColumns = primaryKeys.map((pk) => q(pk)).join(', ')
			columns.push(`PRIMARY KEY (${pkColumns})`)
		}

		// Generate and execute CREATE TABLE IF NOT EXISTS
		const createTableSQL = sql.raw(`
			CREATE TABLE IF NOT EXISTS ${q(tableName)} (
				${columns.join(',\n				')}
			)
		`)

		await (this.db as { execute: (s: unknown) => Promise<unknown> }).execute(
			createTableSQL,
		)

		// Create indexes separately (they might already exist)
		const indexes = config.indexes as Record<string, unknown> | undefined
		if (indexes) {
			for (const index of Object.values(indexes)) {
				const indexConfig = index as Record<string, unknown>
				const indexName =
					(indexConfig.name as string) ||
					`${tableName}_${Math.random().toString(36).slice(2)}_idx`

				let indexColumns: string[] = []
				if (Array.isArray(indexConfig.columns)) {
					indexColumns = indexConfig.columns as string[]
				} else if (
					indexConfig.columns &&
					typeof indexConfig.columns === 'object'
				) {
					indexColumns = Object.keys(indexConfig.columns as object)
				}

				if (indexColumns.length > 0) {
					const uniqueKeyword = indexConfig.unique ? 'UNIQUE' : ''
					const columnsStr = indexColumns.map((col) => q(col)).join(', ')
					const createIndexSQL = sql.raw(`
						CREATE ${uniqueKeyword} INDEX IF NOT EXISTS ${q(indexName)}
						ON ${q(tableName)} (${columnsStr})
					`)
					await (this.db as { execute: (s: unknown) => Promise<unknown> })
						.execute(createIndexSQL)
						.catch(() => {
							// Index might already exist, ignore error
						})
				}
			}
		}
	}

	/**
	 * Map PostgreSQL SQL types to dialect-specific types.
	 */
	private mapSQLTypeForDialect(pgType: string, dialect: string): string {
		const upper = pgType.toUpperCase()
		if (dialect === 'mysql') {
			if (upper.includes('UUID')) return 'CHAR(36)'
			if (upper.includes('JSONB') || upper.includes('JSON')) return 'JSON'
			if (upper.includes('TIMESTAMP')) return 'DATETIME(6)'
			if (upper.includes('DOUBLE PRECISION') || upper.includes('NUMERIC'))
				return 'DOUBLE'
			if (upper.includes('BOOLEAN')) return 'TINYINT(1)'
			return pgType
		}
		if (dialect === 'sqlite') {
			if (upper.includes('UUID')) return 'TEXT'
			if (upper.includes('JSONB') || upper.includes('JSON')) return 'TEXT'
			if (upper.includes('TIMESTAMP')) return 'TEXT'
			if (upper.includes('DOUBLE PRECISION') || upper.includes('NUMERIC'))
				return 'REAL'
			if (upper.includes('BOOLEAN')) return 'INTEGER'
			return pgType
		}
		return pgType
	}

	/**
	 * Infer SQL type from column definition when getSQLType() is not available.
	 */
	private inferSQLType(
		column: Record<string, unknown>,
		dialect: string,
	): string | null {
		const columnStr = String(column)
		if (columnStr.includes('uuid')) return 'UUID'
		if (columnStr.includes('timestamp')) return 'TIMESTAMP'
		if (columnStr.includes('double') || columnStr.includes('numeric'))
			return 'DOUBLE PRECISION'
		if (columnStr.includes('boolean')) return 'BOOLEAN'
		if (columnStr.includes('jsonb') || columnStr.includes('json'))
			return 'JSONB'
		if (columnStr.includes('integer') || columnStr.includes('int'))
			return 'INTEGER'
		return null
	}

	/**
	 * Format default value for SQL DEFAULT clause.
	 */
	private formatDefaultValue(
		value: unknown,
		colType?: string,
		dialect = 'postgresql',
	): string | null {
		if (value === undefined || value === null) {
			return null
		}

		const escapeStr = (s: string) => s.replace(/'/g, "''")

		// Handle Drizzle SQL template literal objects (from sql`...`)
		if (typeof value === 'object' && value !== null) {
			if ('queryChunks' in value) {
				const chunks = (value as { queryChunks: unknown[] }).queryChunks
				const rawSQL = chunks
					.map((chunk: unknown) => {
						if (
							typeof chunk === 'object' &&
							chunk !== null &&
							'value' in chunk
						) {
							const arr = (chunk as { value: unknown[] }).value
							return arr.join('')
						}
						return String(chunk)
					})
					.join('')
				// Map PostgreSQL-specific SQL to dialect
				if (rawSQL.includes('gen_random_uuid')) {
					if (dialect === 'mysql') return 'UUID()'
					if (dialect === 'sqlite')
						return "(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))))"
					return 'gen_random_uuid()'
				}
				if (rawSQL.includes('now()') || rawSQL.includes('CURRENT_TIMESTAMP')) {
					if (dialect === 'sqlite') return "(datetime('now'))"
					return 'NOW()'
				}
				return rawSQL || null
			}
			if ('sql' in value) {
				return (value as { sql: string }).sql
			}
		}

		// Handle functions (like gen_random_uuid, now)
		if (typeof value === 'function') {
			const funcStr = value.toString()
			if (funcStr.includes('gen_random_uuid')) {
				if (dialect === 'mysql') return 'UUID()'
				if (dialect === 'sqlite')
					return "(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))))"
				const upperType = colType?.toUpperCase() ?? ''
				if (upperType.includes('TEXT') || upperType.includes('VARCHAR')) {
					return 'gen_random_uuid()::text'
				}
				return 'gen_random_uuid()'
			}
			if (funcStr.includes('now') || funcStr.includes('CURRENT_TIMESTAMP')) {
				if (dialect === 'sqlite') return "(datetime('now'))"
				return 'NOW()'
			}
			return null
		}

		// Handle arrays (JSONB default)
		if (Array.isArray(value)) {
			const json = `'${escapeStr(JSON.stringify(value))}'`
			if (dialect === 'postgresql') return `${json}::jsonb`
			return json
		}

		// Handle objects (JSONB default)
		if (typeof value === 'object') {
			const json = `'${escapeStr(JSON.stringify(value))}'`
			if (dialect === 'postgresql') return `${json}::jsonb`
			return json
		}

		// Handle strings
		if (typeof value === 'string') {
			return `'${escapeStr(value)}'`
		}

		// Handle numbers and booleans
		if (typeof value === 'number' || typeof value === 'boolean') {
			return String(value)
		}

		return null
	}

	/**
	 * Connect to the database and return a NestJS dynamic module.
	 * Supports both synchronous (pg) and asynchronous (neon) drivers.
	 */
	connect(options: MagnetModuleOptions): DynamicModule {
		this.options = options
		const config = options.db as DrizzleConfig
		const driver = config.driver || 'pg'

		// If already connected, return empty module
		if (this.db) {
			return {
				module: DrizzleModule,
				imports: [],
				providers: [],
				exports: [],
			}
		}

		// For Neon driver, use async factory provider
		if (driver === 'neon') {
			return {
				module: DrizzleModule,
				providers: [
					{
						provide: DRIZZLE_DB,
						useFactory: async () => {
							const { db, pool } = await this.createConnectionAsync(config)
							this.db = db
							this.pool = pool
							return db
						},
					},
					{ provide: DRIZZLE_CONFIG, useValue: config },
				],
				exports: [DRIZZLE_DB, DRIZZLE_CONFIG],
				global: true,
			}
		}

		// Synchronous connection for pg driver
		const { db, pool } = this.createConnection(config)
		this.db = db
		this.pool = pool

		return {
			module: DrizzleModule,
			providers: [
				{ provide: DRIZZLE_DB, useValue: this.db },
				{ provide: DRIZZLE_CONFIG, useValue: config },
			],
			exports: [DRIZZLE_DB, DRIZZLE_CONFIG],
			global: true,
		}
	}

	/**
	 * Register schemas and return a NestJS dynamic module with model providers.
	 * Note: Providers return raw { db, table, schemaClass } for the model() method to wrap.
	 */
	forFeature(schemas: Type | Type[]): DynamicModule {
		const schemaArray = Array.isArray(schemas) ? schemas : [schemas]

		const providers = schemaArray.map((schemaClass) => {
			// Generate the Drizzle table schema
			const { table, tableName } = getOrGenerateSchema(schemaClass)
			this.schemaRegistry.set(schemaClass.name, { table, tableName })

			const token = this.token(schemaClass.name)

			return {
				provide: token,
				useFactory: async () => {
					if (!this.db) {
						throw new Error(
							'Drizzle database not initialized. Call connect() first.',
						)
					}
					// Ensure tables are created before returning model data
					// This is called lazily when models are first accessed
					await this.ensureTablesCreated()
					// Return raw model data - model() will wrap it into a class
					return { db: this.db, table, schemaClass }
				},
			}
		})

		return {
			module: DrizzleFeatureModule,
			providers,
			exports: providers.map((p) => p.provide),
		}
	}

	/**
	 * Create a Model class from raw model data or a factory (for lazy init).
	 * Core's DatabaseModule passes an async factory; we support both.
	 */
	model<T>(
		modelDataOrFactory:
			| { db: DrizzleDB; table: PgTable; schemaClass: Type }
			| (() => Promise<{ db: DrizzleDB; table: PgTable; schemaClass: Type }>),
	): any {
		if (typeof modelDataOrFactory === 'function') {
			return this.createLazyModel<T>(modelDataOrFactory)
		}
		return createModel<T>(
			modelDataOrFactory.db,
			modelDataOrFactory.table,
			modelDataOrFactory.schemaClass,
		)
	}

	/**
	 * Create a model class that lazily resolves the factory (used by core's DatabaseModule).
	 */
	private createLazyModel<T>(
		factory: () => Promise<{
			db: DrizzleDB
			table: PgTable
			schemaClass: Type
		}>,
	): any {
		// Plain class then cast to Model<T> so query()/native() can return thenables
		return class LazyDrizzleModelAdapter {
			private _instance: InstanceType<
				ReturnType<typeof createModel<T>>
			> | null = null
			private _initPromise: Promise<void> | null = null
			private _factory = factory
			currentLocale?: string
			currentVersion?: string

			private async _ensureInstance(): Promise<
				InstanceType<ReturnType<typeof createModel<T>>>
			> {
				if (this._instance) return this._instance
				if (this._initPromise) {
					await this._initPromise
					if (!this._instance) throw new Error('Drizzle adapter init failed')
					return this._instance
				}
				this._initPromise = (async () => {
					const data = await this._factory()
					const AdapterClass = createModel<T>(
						data.db,
						data.table,
						data.schemaClass,
					)
					this._instance = new AdapterClass()
					if (this.currentLocale) this._instance.locale(this.currentLocale)
					if (this.currentVersion) this._instance.version(this.currentVersion)
				})()
				await this._initPromise
				if (!this._instance) throw new Error('Drizzle adapter init failed')
				return this._instance
			}

			locale(locale: string): this {
				this.currentLocale = locale
				if (this._instance) this._instance.locale(locale)
				return this
			}
			version(versionId: string): this {
				this.currentVersion = versionId
				if (this._instance) this._instance.version(versionId)
				return this
			}
			async create(
				data: Parameters<
					InstanceType<ReturnType<typeof createModel<T>>>['create']
				>[0],
				options?: Parameters<
					InstanceType<ReturnType<typeof createModel<T>>>['create']
				>[1],
			) {
				const inst = await this._ensureInstance()
				return inst.create(data, options)
			}
			async find() {
				const inst = await this._ensureInstance()
				return inst.find()
			}
			async findById(id: string) {
				const inst = await this._ensureInstance()
				return inst.findById(id)
			}
			async findOne(
				query: Parameters<
					InstanceType<ReturnType<typeof createModel<T>>>['findOne']
				>[0],
			) {
				const inst = await this._ensureInstance()
				return inst.findOne(query)
			}
			async findMany(
				query: Parameters<
					InstanceType<ReturnType<typeof createModel<T>>>['findMany']
				>[0],
			) {
				const inst = await this._ensureInstance()
				return inst.findMany(query)
			}
			async update(
				query: Parameters<
					InstanceType<ReturnType<typeof createModel<T>>>['update']
				>[0],
				data: Parameters<
					InstanceType<ReturnType<typeof createModel<T>>>['update']
				>[1],
				options?: Parameters<
					InstanceType<ReturnType<typeof createModel<T>>>['update']
				>[2],
			) {
				const inst = await this._ensureInstance()
				return inst.update(query, data, options)
			}
			async delete(
				query: Parameters<
					InstanceType<ReturnType<typeof createModel<T>>>['delete']
				>[0],
			) {
				const inst = await this._ensureInstance()
				return inst.delete(query)
			}
			async findVersions(documentId: string) {
				const inst = await this._ensureInstance()
				return inst.findVersions(documentId)
			}
			async findVersionById(versionId: string) {
				const inst = await this._ensureInstance()
				return inst.findVersionById(versionId)
			}
			async restoreVersion(versionId: string) {
				const inst = await this._ensureInstance()
				return inst.restoreVersion(versionId)
			}
			query() {
				return new LazyQueryBuilder<T>(async () => {
					const inst = await this._ensureInstance()
					return inst.query()
				})
			}
			native() {
				return this._ensureInstance().then((inst) => inst.native())
			}
		} as unknown as new () => import('@magnet-cms/common').Model<T>
	}

	/**
	 * Get the injection token for a schema.
	 */
	token(schema: string): string {
		return getModelToken(schema)
	}

	/**
	 * Get the database instance (for advanced usage).
	 */
	getDb(): DrizzleDB | null {
		return this.db
	}

	/**
	 * Check if adapter supports a feature
	 */
	supports(feature: AdapterFeature): boolean {
		const supportedFeatures: AdapterFeature[] = [
			'transactions',
			'json-queries',
			'full-text-search',
			'migrations',
		]
		return supportedFeatures.includes(feature)
	}

	/**
	 * Get adapter capabilities
	 */
	getCapabilities(): AdapterCapabilities {
		return {
			databases: ['postgresql', 'mysql', 'sqlite'],
			features: [
				'transactions',
				'json-queries',
				'full-text-search',
				'migrations',
			],
			handlesVersioning: false,
			supportsLazyCreation: true,
		}
	}

	/**
	 * Create database connection based on config (synchronous, for pg/mysql/sqlite drivers).
	 */
	private createConnection(config: DrizzleConfig): {
		db: DrizzleDB
		pool: Pool | { end?: () => Promise<void>; close?: () => void }
	} {
		const dialect = config.dialect || 'postgresql'

		switch (dialect) {
			case 'postgresql': {
				const pool = new Pool({
					connectionString: config.connectionString,
				})
				const db = drizzle(pool, {
					logger: config.debug,
				})
				return { db: db as DrizzleDB, pool }
			}
			case 'mysql': {
				// biome-ignore format: multiline typeof import breaks DTS build
				const mysql = require('mysql2/promise') as typeof import('mysql2/promise')
				const { drizzle: drizzleMysql } =
					require('drizzle-orm/mysql2') as typeof import('drizzle-orm/mysql2')
				const pool = mysql.createPool({ uri: config.connectionString })
				const db = drizzleMysql({ client: pool })
				return { db: db as unknown as DrizzleDB, pool }
			}
			case 'sqlite': {
				const Database = require('better-sqlite3') as new (
					path: string,
				) => import('better-sqlite3').Database
				// biome-ignore format: multiline typeof import breaks DTS build
				const { drizzle: drizzleSqlite } =
					require('drizzle-orm/better-sqlite3') as typeof import('drizzle-orm/better-sqlite3')
				const sqlite = new Database(config.connectionString)
				const db = drizzleSqlite({ client: sqlite })
				return { db: db as unknown as DrizzleDB, pool: sqlite }
			}
			default:
				throw new Error(`Unknown dialect: ${dialect}`)
		}
	}

	/**
	 * Create database connection asynchronously (required for Neon driver).
	 */
	private async createConnectionAsync(
		config: DrizzleConfig,
	): Promise<{ db: DrizzleDB; pool: any }> {
		const dialect = config.dialect || 'postgresql'
		const driver = config.driver || 'pg'

		switch (dialect) {
			case 'postgresql': {
				// Handle Neon driver
				if (driver === 'neon') {
					// Use WebSocket connection for better compatibility
					const { db, pool } = await createNeonWebSocketConnection(config)
					return { db: db as DrizzleDB, pool }
				}

				// Default PostgreSQL with pg driver
				const pool = new Pool({
					connectionString: config.connectionString,
				})
				const db = drizzle(pool, {
					logger: config.debug,
				})
				return { db: db as DrizzleDB, pool }
			}
			case 'mysql':
			case 'sqlite':
				throw new Error(
					`Dialect "${dialect}" not yet implemented. PostgreSQL is currently supported.`,
				)
			default:
				throw new Error(`Unknown dialect: ${dialect}`)
		}
	}

	/**
	 * Graceful shutdown - close database connections.
	 */
	async onModuleDestroy(): Promise<void> {
		if (this.pool) {
			if (
				typeof (this.pool as { end?: () => Promise<void> }).end === 'function'
			) {
				await (this.pool as { end: () => Promise<void> }).end()
			} else if (
				typeof (this.pool as { close?: () => void }).close === 'function'
			) {
				;(this.pool as { close: () => void }).close()
			}
			this.pool = null
			this.db = null
		}
	}
}

/**
 * Singleton adapter instance exported for use by the framework.
 */
export const Adapter = new DrizzleAdapter()
