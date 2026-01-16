import {
	Calendar,
	Hash,
	Link2,
	List,
	type LucideIcon,
	ToggleLeft,
	Type,
} from 'lucide-react'
import type {
	FieldType,
	FieldUIConfig,
	ValidationRule,
} from '../types/builder.types'

/**
 * Field type definition for the builder UI
 */
export interface FieldTypeDefinition {
	id: FieldType
	label: string
	description: string
	icon: LucideIcon
	tsType: string
	defaultValidations: ValidationRule[]
	defaultUI: FieldUIConfig
	hasOptions?: boolean // For select fields
	hasRelationConfig?: boolean // For relation fields
	requiresTransformer?: boolean // For Date fields
}

/**
 * All available field types in the schema builder
 */
export const FIELD_TYPES: FieldTypeDefinition[] = [
	{
		id: 'text',
		label: 'Text',
		description: 'Short or long text content',
		icon: Type,
		tsType: 'string',
		defaultValidations: [{ type: 'IsString' }, { type: 'IsNotEmpty' }],
		defaultUI: { type: 'text' },
	},
	{
		id: 'number',
		label: 'Number',
		description: 'Integer or decimal numbers',
		icon: Hash,
		tsType: 'number',
		defaultValidations: [{ type: 'IsNumber' }],
		defaultUI: { type: 'number' },
	},
	{
		id: 'date',
		label: 'Date',
		description: 'Date and time values',
		icon: Calendar,
		tsType: 'Date',
		defaultValidations: [{ type: 'IsDate' }],
		defaultUI: { type: 'date' },
		requiresTransformer: true,
	},
	{
		id: 'boolean',
		label: 'Boolean',
		description: 'True or false toggle',
		icon: ToggleLeft,
		tsType: 'boolean',
		defaultValidations: [{ type: 'IsBoolean' }],
		defaultUI: { type: 'switch' },
	},
	{
		id: 'select',
		label: 'Select',
		description: 'Dropdown with predefined options',
		icon: List,
		tsType: 'string',
		defaultValidations: [{ type: 'IsString' }],
		defaultUI: { type: 'select', options: [] },
		hasOptions: true,
	},
	{
		id: 'relation',
		label: 'Relation',
		description: 'Reference to another schema',
		icon: Link2,
		tsType: 'string',
		defaultValidations: [{ type: 'IsString' }],
		defaultUI: { type: 'relationship' },
		hasRelationConfig: true,
	},
]

/**
 * Get field type definition by ID
 */
export function getFieldTypeDefinition(
	type: FieldType,
): FieldTypeDefinition | undefined {
	return FIELD_TYPES.find((ft) => ft.id === type)
}

/**
 * UI subtype definition for field type variations
 */
export interface UISubtypeDefinition {
	id: string
	label: string
	description: string
}

/**
 * Available UI subtypes for each base field type.
 * These map to the UITypes in @magnet/common and are rendered by FormBuilder.
 */
export const UI_SUBTYPES: Record<FieldType, UISubtypeDefinition[]> = {
	text: [
		{ id: 'text', label: 'Text Input', description: 'Single line text' },
		{ id: 'textarea', label: 'Text Area', description: 'Multi-line text' },
		{ id: 'email', label: 'Email', description: 'Email with validation' },
		{ id: 'phone', label: 'Phone', description: 'Phone number input' },
		{ id: 'richText', label: 'Rich Text', description: 'Rich text editor' },
	],
	number: [
		{
			id: 'number',
			label: 'Number Input',
			description: 'Standard number field',
		},
		{
			id: 'quantity',
			label: 'Quantity',
			description: 'Number with +/- buttons',
		},
	],
	date: [
		{
			id: 'date',
			label: 'Date Picker',
			description: 'Calendar date selection',
		},
	],
	boolean: [
		{ id: 'switch', label: 'Switch', description: 'Toggle switch' },
		{ id: 'checkbox', label: 'Checkbox', description: 'Checkbox input' },
	],
	select: [
		{ id: 'select', label: 'Dropdown', description: 'Single select dropdown' },
		{
			id: 'multiSelect',
			label: 'Multi Select',
			description: 'Select multiple options',
		},
		{ id: 'combobox', label: 'Combobox', description: 'Searchable dropdown' },
		{ id: 'radio', label: 'Radio Group', description: 'Radio button options' },
	],
	relation: [
		{
			id: 'relationship',
			label: 'Relationship',
			description: 'Link to another schema',
		},
	],
}

/**
 * Get UI subtypes for a field type
 */
export function getUISubtypes(type: FieldType): UISubtypeDefinition[] {
	return UI_SUBTYPES[type] || []
}

/**
 * Get the icon component for a field type
 */
export function getFieldTypeIcon(type: FieldType): LucideIcon {
	const definition = getFieldTypeDefinition(type)
	return definition?.icon ?? Type
}

/**
 * Available validation rules for each field type
 */
export const VALIDATION_RULES_BY_TYPE: Record<FieldType, string[]> = {
	text: [
		'IsString',
		'IsNotEmpty',
		'Length',
		'MinLength',
		'MaxLength',
		'IsEmail',
		'IsUrl',
		'IsUUID',
		'Matches',
	],
	number: ['IsNumber', 'IsInt', 'IsPositive', 'IsNegative', 'Min', 'Max'],
	date: ['IsDate', 'IsNotEmpty', 'MinDate', 'MaxDate'],
	boolean: ['IsBoolean'],
	select: ['IsString', 'IsNotEmpty', 'IsIn'],
	relation: ['IsString', 'IsNotEmpty', 'IsMongoId'],
}

/**
 * Validation rule definitions with constraint info
 */
export interface ValidationRuleDefinition {
	type: string
	label: string
	description: string
	constraintCount: number // 0 = no args, 1 = single arg, 2 = two args (min, max)
	constraintLabels?: string[]
}

export const VALIDATION_RULE_DEFINITIONS: ValidationRuleDefinition[] = [
	{
		type: 'IsString',
		label: 'Is String',
		description: 'Must be a string',
		constraintCount: 0,
	},
	{
		type: 'IsNumber',
		label: 'Is Number',
		description: 'Must be a number',
		constraintCount: 0,
	},
	{
		type: 'IsInt',
		label: 'Is Integer',
		description: 'Must be an integer',
		constraintCount: 0,
	},
	{
		type: 'IsBoolean',
		label: 'Is Boolean',
		description: 'Must be true or false',
		constraintCount: 0,
	},
	{
		type: 'IsDate',
		label: 'Is Date',
		description: 'Must be a valid date',
		constraintCount: 0,
	},
	{
		type: 'IsNotEmpty',
		label: 'Not Empty',
		description: 'Cannot be empty',
		constraintCount: 0,
	},
	{
		type: 'IsEmail',
		label: 'Is Email',
		description: 'Must be a valid email',
		constraintCount: 0,
	},
	{
		type: 'IsUrl',
		label: 'Is URL',
		description: 'Must be a valid URL',
		constraintCount: 0,
	},
	{
		type: 'IsUUID',
		label: 'Is UUID',
		description: 'Must be a valid UUID',
		constraintCount: 0,
	},
	{
		type: 'IsMongoId',
		label: 'Is MongoDB ID',
		description: 'Must be a valid MongoDB ObjectId',
		constraintCount: 0,
	},
	{
		type: 'IsPositive',
		label: 'Is Positive',
		description: 'Must be a positive number',
		constraintCount: 0,
	},
	{
		type: 'IsNegative',
		label: 'Is Negative',
		description: 'Must be a negative number',
		constraintCount: 0,
	},
	{
		type: 'Length',
		label: 'Length',
		description: 'String length between min and max',
		constraintCount: 2,
		constraintLabels: ['Min', 'Max'],
	},
	{
		type: 'MinLength',
		label: 'Min Length',
		description: 'Minimum string length',
		constraintCount: 1,
		constraintLabels: ['Min'],
	},
	{
		type: 'MaxLength',
		label: 'Max Length',
		description: 'Maximum string length',
		constraintCount: 1,
		constraintLabels: ['Max'],
	},
	{
		type: 'Min',
		label: 'Minimum',
		description: 'Minimum number value',
		constraintCount: 1,
		constraintLabels: ['Min'],
	},
	{
		type: 'Max',
		label: 'Maximum',
		description: 'Maximum number value',
		constraintCount: 1,
		constraintLabels: ['Max'],
	},
	{
		type: 'Matches',
		label: 'Matches Pattern',
		description: 'Must match regex pattern',
		constraintCount: 1,
		constraintLabels: ['Pattern'],
	},
	{
		type: 'IsIn',
		label: 'Is In List',
		description: 'Must be one of the allowed values',
		constraintCount: 1,
		constraintLabels: ['Values (comma-separated)'],
	},
]

/**
 * Get validation rule definition by type
 */
export function getValidationRuleDefinition(
	type: string,
): ValidationRuleDefinition | undefined {
	return VALIDATION_RULE_DEFINITIONS.find((r) => r.type === type)
}

/**
 * Relation type options
 */
export const RELATION_TYPES = [
	{
		value: 'oneToOne',
		label: 'One to One',
		description: 'Each record relates to exactly one other',
	},
	{
		value: 'oneToMany',
		label: 'One to Many',
		description: 'One record relates to many others',
	},
	{
		value: 'manyToOne',
		label: 'Many to One',
		description: 'Many records relate to one',
	},
	{
		value: 'manyToMany',
		label: 'Many to Many',
		description: 'Many records relate to many others',
	},
] as const

/**
 * Color mapping for field type badges
 */
export const FIELD_TYPE_COLORS: Record<FieldType, string> = {
	text: 'bg-blue-50 text-blue-700 border-blue-200',
	number: 'bg-amber-50 text-amber-700 border-amber-200',
	date: 'bg-green-50 text-green-700 border-green-200',
	boolean: 'bg-purple-50 text-purple-700 border-purple-200',
	select: 'bg-cyan-50 text-cyan-700 border-cyan-200',
	relation: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}
