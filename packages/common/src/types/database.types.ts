import { DynamicModule, Type } from '@nestjs/common'
import { MagnetModuleOptions } from './config.types'

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
}

export type DBConfig = MongooseConfig | DrizzleConfig

export abstract class DatabaseAdapter {
	abstract connect(options: MagnetModuleOptions): DynamicModule
	abstract forFeature(schemas: Type | Type[]): DynamicModule
	abstract model<T>(modelInstance: any): any
	abstract token(schema: string): string
}
