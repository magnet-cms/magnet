import { Type } from '@nestjs/common'

export type ResolverOptions = {
	schema: Type
}

export type ResolverInput = (() => Type) | ResolverOptions

export type ResolveOptions = {
	type: Type | Type[]
	isArray?: boolean
	description?: string
}

export type ResolveInput =
	| (() => Type | Type[])
	| (() => Type)[]
	| ResolveOptions

/**
 * Property default value - can be a primitive, object, array, or factory function
 */
export type PropDefaultValue =
	| string
	| number
	| boolean
	| null
	| Record<string, unknown>
	| unknown[]
	| (() => unknown)

export type PropOptions = {
	type?: Type | Type[]
	description?: string
	required?: boolean
	unique?: boolean
	default?: PropDefaultValue
	nullable?: boolean
	intl?: boolean
	hidden?: boolean
	readonly?: boolean
	ref?: string
}

export type BaseSchemaOptions = {
	timestamps?: boolean
}

export type SchemaOptions = {
	versioning?: boolean
	i18n?: boolean
	/**
	 * Whether the schema is visible in the Content Manager.
	 * Set to false for system schemas that have dedicated admin pages.
	 * @default true
	 */
	visible?: boolean
}
