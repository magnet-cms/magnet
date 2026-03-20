/**
 * DTOs for Schema Playground API
 */

/**
 * Field validation rule
 */
export interface ValidationRuleDto {
	type: string
	constraints?: (string | number)[]
	message?: string
}

/**
 * Field UI configuration
 */
export interface FieldUIDto {
	type?: string
	label?: string
	description?: string
	placeholder?: string
	tab?: string
	side?: boolean
	row?: boolean
	options?: { key: string; value: string }[]
}

/**
 * Field property configuration
 */
export interface FieldPropDto {
	required?: boolean
	unique?: boolean
	default?: unknown
	intl?: boolean
	hidden?: boolean
	readonly?: boolean
}

/**
 * Relation configuration
 */
export interface RelationConfigDto {
	targetSchema: string
	relationType: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany'
	inverseSide?: string
}

/**
 * Schema field definition
 */
export interface SchemaFieldDto {
	name: string
	displayName: string
	type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'relation'
	tsType: string
	prop: FieldPropDto
	ui: FieldUIDto
	validations: ValidationRuleDto[]
	relationConfig?: RelationConfigDto
}

/**
 * Schema configuration options
 */
export interface SchemaOptionsDto {
	versioning?: boolean
	i18n?: boolean
}

/**
 * Request body for creating/updating a schema
 */
export interface CreateSchemaDto {
	name: string
	options?: SchemaOptionsDto
	fields: SchemaFieldDto[]
}

/**
 * Response for schema list
 */
export interface SchemaListItemDto {
	name: string
	apiId: string
	fieldCount: number
	hasVersioning: boolean
	hasI18n: boolean
	createdAt?: Date
	updatedAt?: Date
}

/**
 * Response for schema details
 */
export interface SchemaDetailDto {
	name: string
	apiId: string
	options: SchemaOptionsDto
	fields: SchemaFieldDto[]
	generatedCode: string
}

/**
 * Response for code preview (without saving)
 */
export interface CodePreviewDto {
	code: string
	json: object
}

/**
 * Information about a conflict when updating a schema
 */
export interface ConflictInfo {
	fieldName: string
	type: 'type_change' | 'required_change' | 'field_removed'
	message: string
	oldValue?: string
	newValue?: string
}

/**
 * Response for creating a new module
 */
export interface CreateModuleResponseDto extends SchemaDetailDto {
	createdFiles: string[]
	message: string
}
