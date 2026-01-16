import { SCHEMA_METADATA_KEY, SCHEMA_OPTIONS_METADATA_KEY } from '~/constants'
import { SchemaOptions } from '~/types'
import { detectDatabaseAdapter } from '~/utils'

const defaultSchemaOptions: SchemaOptions = {
	versioning: true,
	i18n: true,
}

export function Schema(options: SchemaOptions = {}): ClassDecorator {
	return (target) => {
		const adapter = detectDatabaseAdapter()
		const mergedOptions = { ...defaultSchemaOptions, ...options }

		Reflect.defineMetadata(SCHEMA_METADATA_KEY, true, target)
		Reflect.defineMetadata(SCHEMA_OPTIONS_METADATA_KEY, mergedOptions, target)

		const { Schema } = require(`@magnet-cms/adapter-${adapter}`)
		return Schema()(target)
	}
}

export function getSchemaOptions(target: Function): SchemaOptions {
	return (
		Reflect.getMetadata(SCHEMA_OPTIONS_METADATA_KEY, target) ||
		defaultSchemaOptions
	)
}
