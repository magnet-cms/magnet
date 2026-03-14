import { SchemaOptions } from '@magnet-cms/common'

const DRIZZLE_SCHEMA_KEY = 'drizzle:schema'

/**
 * Drizzle-specific Schema decorator.
 * Stores metadata that will be used to generate Drizzle table schemas.
 *
 * This is called by the common @Schema() decorator after detecting
 * that Drizzle is the active database adapter.
 */
export function Schema(options?: SchemaOptions): ClassDecorator {
	return (target) => {
		// Store Drizzle-specific metadata
		Reflect.defineMetadata(
			DRIZZLE_SCHEMA_KEY,
			{
				name: target.name,
				tableName: `${target.name.toLowerCase()}s`,
				i18n: options?.i18n ?? true,
				versioning: options?.versioning ?? true,
			},
			target,
		)
	}
}

/**
 * Get Drizzle schema metadata from a class
 */
export function getDrizzleSchemaMetadata(target: Function): {
	name: string
	tableName: string
	i18n: boolean
	versioning: boolean
} | null {
	return Reflect.getMetadata(DRIZZLE_SCHEMA_KEY, target) || null
}
