import { PropOptions } from '@magnet-cms/common'
import { Prop as MongooseProp } from '@nestjs/mongoose'
import { SchemaTypes } from 'mongoose'

export const Mixed = SchemaTypes.Mixed

export function Prop(options?: PropOptions): PropertyDecorator {
	return MongooseProp({
		required: options?.required,
		default: options?.default,
		unique: options?.unique,
		type: options?.type,
	})
}
