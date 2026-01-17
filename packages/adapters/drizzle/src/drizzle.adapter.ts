import { DatabaseAdapter, MagnetModuleOptions } from '@magnet-cms/common'
import { DynamicModule, Injectable, Module, Type } from '@nestjs/common'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { createNeonWebSocketConnection } from './dialects/neon'
import { createModel } from './drizzle.model'
import { getOrGenerateSchema } from './schema/schema.generator'
import type { DrizzleConfig, DrizzleDB } from './types'

/**
 * Injection tokens
 */
export const DRIZZLE_DB = 'DRIZZLE_DB'
export const DRIZZLE_CONFIG = 'DRIZZLE_CONFIG'

/**
 * Get model token for a schema
 */
export function getDrizzleModelToken(schema: string): string {
	return `DRIZZLE_MODEL_${schema.toUpperCase()}`
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
	private db: DrizzleDB | null = null
	private pool: Pool | null = null
	private options: MagnetModuleOptions | null = null
	private schemaRegistry: Map<string, any> = new Map()

	constructor() {
		super()
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
				useFactory: () => {
					if (!this.db) {
						throw new Error(
							'Drizzle database not initialized. Call connect() first.',
						)
					}
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
	 * Create a Model class from raw model data.
	 * Called by core's DatabaseModule to wrap the model instance.
	 */
	model<T>(modelData: { db: DrizzleDB; table: any; schemaClass: Type }): any {
		return createModel<T>(modelData.db, modelData.table, modelData.schemaClass)
	}

	/**
	 * Get the injection token for a schema.
	 */
	token(schema: string): string {
		return getDrizzleModelToken(schema)
	}

	/**
	 * Get the database instance (for advanced usage).
	 */
	getDb(): DrizzleDB | null {
		return this.db
	}

	/**
	 * Create database connection based on config (synchronous, for pg driver).
	 */
	private createConnection(config: DrizzleConfig): {
		db: DrizzleDB
		pool: Pool
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
			await this.pool.end()
			this.pool = null
			this.db = null
		}
	}
}

/**
 * Singleton adapter instance exported for use by the framework.
 */
export const Adapter = new DrizzleAdapter()
