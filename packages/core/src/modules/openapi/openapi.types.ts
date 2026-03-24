/**
 * Configuration options for the OpenAPI module.
 */
export interface OpenAPIConfig {
	/** Enable or disable OpenAPI support (default: enabled in dev, disabled in prod) */
	enabled?: boolean
	/** Path to serve the Swagger UI (default: '/api-docs') */
	path?: string
	/** API title shown in the Swagger UI (default: 'Magnet CMS API') */
	title?: string
	/** API version shown in the Swagger UI (default: '1.0.0') */
	version?: string
}

/** Injection token for OpenAPI config */
export const OPENAPI_CONFIG = 'OPENAPI_CONFIG'

/** Minimal OpenAPI 3.0 path item object */
export interface OASPathItem {
	get?: OASOperation
	post?: OASOperation
	put?: OASOperation
	delete?: OASOperation
	patch?: OASOperation
}

/** Minimal OpenAPI 3.0 operation object */
export interface OASOperation {
	summary?: string
	description?: string
	tags?: string[]
	security?: Array<Record<string, string[]>>
	parameters?: OASParameter[]
	requestBody?: OASRequestBody
	responses: Record<string, OASResponse>
	operationId?: string
}

export interface OASParameter {
	name: string
	in: 'path' | 'query' | 'header' | 'cookie'
	required?: boolean
	description?: string
	schema?: OASSchema
}

export interface OASRequestBody {
	required?: boolean
	content: Record<string, { schema: OASSchema }>
}

export interface OASResponse {
	description: string
	content?: Record<string, { schema: OASSchema }>
}

export interface OASSchema {
	type?: string
	format?: string
	properties?: Record<string, OASSchema>
	items?: OASSchema
	required?: string[]
	description?: string
	enum?: unknown[]
	$ref?: string
}

export interface OASSecurityScheme {
	type: string
	scheme?: string
	bearerFormat?: string
	in?: string
	name?: string
	description?: string
}

export interface OASComponents {
	schemas?: Record<string, OASSchema>
	securitySchemes?: Record<string, OASSecurityScheme>
}

/** Minimal OpenAPI 3.0 document */
export interface OASDocument {
	openapi: string
	info: {
		title: string
		version: string
		description?: string
	}
	paths?: Record<string, OASPathItem>
	components?: OASComponents
	security?: Array<Record<string, string[]>>
	tags?: Array<{ name: string; description?: string }>
}
