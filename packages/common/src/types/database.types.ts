import { DynamicModule, OnModuleDestroy, Type } from '@nestjs/common'
import type { Model } from '../model'

export type MongooseConfig = {
	uri: string
}

/**
 * Drizzle ORM configuration for SQL databases.
 * Supports PostgreSQL, MySQL, and SQLite through Drizzle ORM.
 */
export type DrizzleConfig = {
	/** Database connection string */
	connectionString: string
	/** SQL dialect to use */
	dialect: 'postgresql' | 'mysql' | 'sqlite'
	/** Database driver to use (auto-detected if not specified) */
	driver?: 'pg' | 'neon' | 'mysql2' | 'better-sqlite3'
	/** Enable debug logging */
	debug?: boolean
	/**
	 * Migration configuration. If omitted, falls back to legacy CREATE TABLE IF NOT EXISTS behavior.
	 */
	migrations?: {
		/** Migration mode — 'auto' for development, 'manual' for production */
		mode?: 'auto' | 'manual'
		/** Directory where migration files are stored (default: './migrations') */
		directory?: string
		/** Table name for tracking applied migrations (default: '_magnet_migrations') */
		tableName?: string
		/** Whether to run each migration in a transaction (default: true) */
		transactional?: boolean
	}
}

export type DBConfig = MongooseConfig | DrizzleConfig

/**
 * Database model instance type - the native model from the adapter
 * This could be a Mongoose Model, Drizzle table, or other adapter-specific type
 */
export type DatabaseModelInstance = unknown

/**
 * Model class constructor returned by adapter.model()
 */
export type ModelClass<T> = new () => Model<T>

/**
 * Supported adapter names
 */
export type AdapterName = 'mongoose' | 'drizzle' | 'prisma' | 'typeorm'

/**
 * Features an adapter may support
 */
export type AdapterFeature =
	| 'transactions'
	| 'nested-transactions'
	| 'json-queries'
	| 'full-text-search'
	| 'geospatial'
	| 'change-streams'
	| 'migrations'

/**
 * Database types supported by adapters
 */
export type DatabaseType =
	| 'mongodb'
	| 'postgresql'
	| 'mysql'
	| 'sqlite'
	| 'mssql'

/**
 * Adapter capability declaration
 */
export interface AdapterCapabilities {
	/** Supported database types */
	databases: DatabaseType[]
	/** Supported features */
	features: AdapterFeature[]
	/** Whether adapter handles its own versioning */
	handlesVersioning: boolean
	/** Whether adapter supports lazy table/collection creation */
	supportsLazyCreation: boolean
}

/**
 * Database adapter contract - all adapters MUST implement this interface
 */
export abstract class DatabaseAdapter implements OnModuleDestroy {
	/**
	 * Adapter identifier
	 */
	abstract readonly name: AdapterName

	/**
	 * Connect to database and return NestJS dynamic module.
	 * @param config - Database configuration (MongooseConfig or DrizzleConfig)
	 */
	abstract connect(config: DBConfig): DynamicModule

	/**
	 * Register schemas as features
	 */
	abstract forFeature(schemas: Type | Type[]): DynamicModule

	/**
	 * Create a Model class for the given native model instance
	 * @param modelInstance - The native model instance from the database driver
	 * @returns A Model class constructor that can be instantiated
	 */
	abstract model<T>(modelInstance: DatabaseModelInstance): ModelClass<T>

	/**
	 * Get injection token for a schema
	 */
	abstract token(schema: string): string

	/**
	 * Cleanup on module destroy
	 */
	abstract onModuleDestroy(): Promise<void>

	/**
	 * Check if adapter supports a feature
	 */
	abstract supports(feature: AdapterFeature): boolean

	/**
	 * Get adapter capabilities
	 */
	abstract getCapabilities(): AdapterCapabilities
}
