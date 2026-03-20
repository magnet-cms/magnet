/**
 * Schema Playground Builder Types
 *
 * These types define the state structure for the visual schema builder.
 */

/**
 * Supported field types in the schema builder
 */
export type FieldType =
	| 'text'
	| 'number'
	| 'date'
	| 'boolean'
	| 'select'
	| 'relation'

/**
 * Select/dropdown option structure
 */
export interface SelectOption {
	key: string
	value: string
}

/**
 * Relation field configuration
 */
export interface RelationConfig {
	targetSchema: string
	relationType: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany'
	inverseSide?: string
}

/**
 * Validation rule structure (maps to class-validator decorators)
 */
export interface ValidationRule {
	type: string // e.g., 'IsString', 'IsNotEmpty', 'Length', 'Min', 'Max'
	constraints?: (string | number)[] // e.g., [10, 255] for Length
	message?: string // Custom error message
}

/**
 * UI configuration (maps to @UI() decorator options)
 */
export interface FieldUIConfig {
	type?: string // UI type override (e.g., 'switch' for boolean)
	label?: string // Display label
	description?: string // Help text
	placeholder?: string // Input placeholder
	tab?: string // Tab name for grouping
	side?: boolean // Show in side panel
	row?: boolean // Half-width layout
	options?: SelectOption[] // For select/radio fields
}

/**
 * Property configuration (maps to @Prop() decorator options)
 */
export interface FieldPropConfig {
	required?: boolean
	unique?: boolean
	default?: unknown
	intl?: boolean // Enable i18n for this field
	hidden?: boolean // Hide from UI
	readonly?: boolean
}

/**
 * Complete field definition in the builder
 */
export interface SchemaField {
	id: string // Unique ID for React keys and drag-drop
	name: string // API ID / property name (e.g., 'firstName')
	displayName: string // Human-readable label (e.g., 'First Name')
	type: FieldType // Field type
	tsType: string // TypeScript type (string, number, Date, boolean, etc.)
	prop: FieldPropConfig // @Prop() options
	ui: FieldUIConfig // @UI() options
	validations: ValidationRule[] // @Validators() rules
	relationConfig?: RelationConfig // For relation fields
}

/**
 * Schema-level configuration (maps to @Schema() decorator options)
 */
export interface SchemaConfig {
	name: string // Class name (e.g., 'Cat')
	apiId?: string // API identifier (e.g., 'cat')
	versioning: boolean // Enable version history
	i18n: boolean // Enable internationalization
	description?: string // Schema description
}

/**
 * View modes for the editor
 */
export type ViewMode = 'builder' | 'json' | 'code'

/**
 * Complete builder state
 */
export interface SchemaBuilderState {
	schema: SchemaConfig
	fields: SchemaField[]
	selectedFieldId: string | null
	viewMode: ViewMode
	isDirty: boolean
	lastSaved: Date | null
	isNew: boolean // Whether this is a new schema or editing existing
}

/**
 * Reducer action types
 */
export type SchemaBuilderAction =
	| { type: 'SET_SCHEMA'; payload: Partial<SchemaConfig> }
	| { type: 'ADD_FIELD'; payload: SchemaField }
	| {
			type: 'UPDATE_FIELD'
			payload: { id: string; changes: Partial<SchemaField> }
	  }
	| { type: 'DELETE_FIELD'; payload: string }
	| { type: 'REORDER_FIELDS'; payload: SchemaField[] }
	| { type: 'SELECT_FIELD'; payload: string | null }
	| { type: 'SET_VIEW_MODE'; payload: ViewMode }
	| { type: 'MARK_DIRTY' }
	| { type: 'MARK_SAVED' }
	| { type: 'RESET'; payload: SchemaBuilderState }
	| {
			type: 'LOAD_SCHEMA'
			payload: { schema: SchemaConfig; fields: SchemaField[] }
	  }

/**
 * Default values for a new schema
 */
export const DEFAULT_SCHEMA_CONFIG: SchemaConfig = {
	name: '',
	versioning: true,
	i18n: true,
}

/**
 * Default builder state
 */
export const DEFAULT_BUILDER_STATE: SchemaBuilderState = {
	schema: DEFAULT_SCHEMA_CONFIG,
	fields: [],
	selectedFieldId: null,
	viewMode: 'builder',
	isDirty: false,
	lastSaved: null,
	isNew: true,
}

/**
 * Mapping from field type to TypeScript type
 */
export const FIELD_TYPE_TO_TS_TYPE: Record<FieldType, string> = {
	text: 'string',
	number: 'number',
	date: 'Date',
	boolean: 'boolean',
	select: 'string',
	relation: 'string', // ObjectId reference
}

/**
 * Context type for the schema builder
 */
export interface SchemaBuilderContextType {
	state: SchemaBuilderState
	dispatch: React.Dispatch<SchemaBuilderAction>

	// Convenience actions
	addField: (field: Partial<SchemaField>) => void
	updateField: (id: string, changes: Partial<SchemaField>) => void
	deleteField: (id: string) => void
	selectField: (id: string | null) => void
	reorderFields: (fields: SchemaField[]) => void
	setViewMode: (mode: ViewMode) => void
	updateSchema: (changes: Partial<SchemaConfig>) => void
	resetState: (state?: SchemaBuilderState) => void

	// Computed values
	selectedField: SchemaField | null
	generatedCode: string
	generatedJSON: object
}
