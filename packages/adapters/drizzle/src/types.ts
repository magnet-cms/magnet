import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { PgDatabase } from 'drizzle-orm/pg-core'

/**
 * Drizzle configuration for MagnetModuleOptions
 */
export interface DrizzleConfig {
	/** Database connection string */
	connectionString: string
	/** SQL dialect to use */
	dialect: 'postgresql' | 'mysql' | 'sqlite'
	/** Database driver to use (auto-detected if not specified) */
	driver?: 'pg' | 'neon' | 'mysql2' | 'better-sqlite3'
	/** Enable debug logging */
	debug?: boolean
}

/**
 * Supported Drizzle database types
 */
export type DrizzleDB = NodePgDatabase | PgDatabase<any>

/**
 * Schema metadata stored via decorators
 */
export interface SchemaMetadata {
	/** Schema class name */
	name: string
	/** Whether i18n is enabled (default: true) */
	i18n?: boolean
	/** Whether versioning is enabled (default: false) */
	versioning?: boolean
	/** Table name (defaults to lowercase pluralized class name) */
	tableName?: string
}

/**
 * Property metadata stored via decorators
 */
export interface PropMetadata {
	/** Property name */
	name: string
	/** Property type */
	type?: any
	/** Whether the property is required */
	required?: boolean
	/** Whether the property is unique */
	unique?: boolean
	/** Default value */
	default?: any
	/** Whether the property is nullable */
	nullable?: boolean
	/** Whether the property supports i18n */
	intl?: boolean
	/** Whether the property is hidden from API responses */
	hidden?: boolean
	/** Whether the property is readonly */
	readonly?: boolean
	/** Reference to another schema (for relationships) */
	ref?: string
	/** Description for documentation */
	description?: string
}

/**
 * Generated Drizzle table schema
 */
export interface GeneratedSchema {
	/** The Drizzle table definition */
	table: any
	/** The schema class reference */
	schemaClass: any
	/** Schema metadata */
	metadata: SchemaMetadata
	/** Property metadata map */
	properties: Map<string, PropMetadata>
}

/**
 * Drizzle module options for NestJS dynamic module
 */
export interface DrizzleModuleOptions {
	/** Drizzle database instance */
	db: DrizzleDB
	/** Configuration */
	config: DrizzleConfig
}
