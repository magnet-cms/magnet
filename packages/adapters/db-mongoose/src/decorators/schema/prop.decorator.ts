import { PropOptions } from '@magnet-cms/common'
import { Prop as MongooseProp } from '@nestjs/mongoose'
import { SchemaTypes } from 'mongoose'

export const Mixed = SchemaTypes.Mixed

/**
 * Mongoose-specific property options that extend PropOptions with ref and sparse
 */
type MongoosePropOptions = PropOptions & {
	ref?: string
	sparse?: boolean
}

export function Prop(options?: PropOptions): PropertyDecorator {
	const mongooseOptions: MongoosePropOptions = {
		required: options?.required,
		default: options?.default,
		unique: options?.unique,
		type: options?.type,
	}

	// When unique is true, also set sparse to true
	// This allows multiple documents to have null/undefined values for the field
	// while still enforcing uniqueness for non-null values
	if (options?.unique) {
		mongooseOptions.sparse = true
	}

	// Only include ref if it's explicitly defined (not undefined)
	if (options?.ref !== undefined) {
		mongooseOptions.ref = options.ref
	}

	return MongooseProp(mongooseOptions)
}
