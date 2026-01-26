import { Type } from '@nestjs/common'
import { SchemaOptions } from './decorator.types'
import { UIDecoratorOptions } from './ui.types'

export type MethodMetadata = {
	name: string
	returnType: {
		type: Type
		isArray: boolean
	}
	params: {
		arg: string
		type: string
		name: string
	}[]
	httpMethod: string
	routePath: string
	guards?: Type[]
	interceptors?: Type[]
	pipes?: Type[]
}

export type ControllerMetadata = {
	name: string
	basePath: string
	methods: MethodMetadata[]
}

export type SchemaPropertyValidation = {
	type: string
	name: string
	constraints?: unknown[]
}

export type SchemaProperty = {
	name: string
	type: string
	isArray: boolean
	unique: boolean
	required: boolean
	validations: SchemaPropertyValidation[]
	ui?: UIDecoratorOptions
	ref?: string
}

export type SchemaMetadata = {
	name: string // lowercase name for URL matching
	className?: string // original class name (PascalCase) for token lookup
	apiName?: string // kebab-case name for routes (e.g., "medical-record")
	displayName?: string // title case name for display (e.g., "Medical Record")
	properties: SchemaProperty[]
	options?: SchemaOptions
}
