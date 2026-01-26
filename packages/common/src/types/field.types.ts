import type { Type } from '@nestjs/common'

/**
 * Base options shared by all field decorators
 */
export interface BaseFieldOptions {
	/** Field is required */
	required?: boolean
	/** Field must be unique */
	unique?: boolean
	/** Default value */
	default?: unknown
	/** Admin UI tab placement */
	tab?: string
	/** Admin UI group within tab */
	group?: string
	/** Field label in admin UI */
	label?: string
	/** Field description/help text */
	description?: string
	/** Field placeholder text */
	placeholder?: string
	/** Hide field in admin UI */
	hidden?: boolean
	/** Make field read-only in admin UI */
	readonly?: boolean
	/** Field display order */
	order?: number
	/** Show field in sidebar (instead of main content area) */
	side?: boolean
}

/**
 * Text field options
 */
export interface TextFieldOptions extends BaseFieldOptions {
	minLength?: number
	maxLength?: number
	pattern?: string
	transform?: 'none' | 'lowercase' | 'uppercase' | 'trim'
}

/**
 * Number field options
 */
export interface NumberFieldOptions extends BaseFieldOptions {
	min?: number
	max?: number
	integer?: boolean
	step?: number
	default?: number
}

/**
 * Boolean field options
 */
export interface BooleanFieldOptions extends BaseFieldOptions {
	default?: boolean
	style?: 'switch' | 'checkbox'
}

/**
 * Date field options
 */
export interface DateFieldOptions extends BaseFieldOptions {
	min?: Date | string
	max?: Date | string
	default?: Date | string | 'now'
}

/**
 * DateTime field options
 */
export interface DateTimeFieldOptions extends DateFieldOptions {
	timezone?: string
}

/**
 * Rich text field options
 */
export interface RichTextFieldOptions extends BaseFieldOptions {
	toolbar?: 'minimal' | 'standard' | 'full'
	maxLength?: number
}

/**
 * Markdown field options
 */
export interface MarkdownFieldOptions extends BaseFieldOptions {
	preview?: boolean
	maxLength?: number
}

/**
 * Code field options
 */
export interface CodeFieldOptions extends BaseFieldOptions {
	language?: string
	lineNumbers?: boolean
}

/**
 * JSON field options
 */
export interface JSONFieldOptions extends BaseFieldOptions {
	/** Optional JSON schema for validation */
	schema?: unknown
}

/**
 * Select option item
 */
export interface SelectOptionItem<T extends string | number = string> {
	label: string
	value: T
}

/**
 * Select field options - generic preserves option value types
 */
export interface SelectFieldOptions<T extends string | number = string>
	extends BaseFieldOptions {
	options: ReadonlyArray<SelectOptionItem<T>> | ReadonlyArray<T>
	default?: T
	multiple?: boolean
}

/**
 * Enum field options - generic preserves enum type
 */
export interface EnumFieldOptions<
	E extends Record<string, string | number> = Record<string, string | number>,
> extends BaseFieldOptions {
	enum: E
	default?: E[keyof E]
	multiple?: boolean
}

/**
 * Tags field options
 */
export interface TagsFieldOptions extends BaseFieldOptions {
	suggestions?: string[]
	maxTags?: number
	allowCreate?: boolean
}

/**
 * Relationship field options
 */
export interface RelationshipFieldOptions extends BaseFieldOptions {
	/** Reference schema name */
	ref: string
	/** Allow multiple selections */
	multiple?: boolean
	/** Fields to display in selection */
	displayFields?: string[]
}

/**
 * Image field options
 */
export interface ImageFieldOptions extends BaseFieldOptions {
	folder?: string
	maxSize?: number
	formats?: ReadonlyArray<'jpg' | 'jpeg' | 'png' | 'gif' | 'webp' | 'svg'>
	dimensions?: {
		minWidth?: number
		maxWidth?: number
		minHeight?: number
		maxHeight?: number
	}
}

/**
 * File field options
 */
export interface FileFieldOptions extends BaseFieldOptions {
	folder?: string
	maxSize?: number
	accept?: string[]
}

/**
 * Gallery field options
 */
export interface GalleryFieldOptions extends ImageFieldOptions {
	maxItems?: number
}

/**
 * Slug field options
 */
export interface SlugFieldOptions extends BaseFieldOptions {
	/** Field to generate slug from */
	from: string
	unique?: boolean
}

/**
 * Email field options
 */
export interface EmailFieldOptions extends BaseFieldOptions {
	pattern?: string
}

/**
 * URL field options
 */
export interface URLFieldOptions extends BaseFieldOptions {
	protocols?: string[]
}

/**
 * Phone field options
 */
export interface PhoneFieldOptions extends BaseFieldOptions {
	defaultCountry?: string
}

/**
 * Address field options
 */
export interface AddressFieldOptions extends BaseFieldOptions {
	provider?: 'google' | 'mapbox' | 'none'
}

/**
 * Color field options
 */
export interface ColorFieldOptions extends BaseFieldOptions {
	format?: 'hex' | 'rgb' | 'hsl'
	presets?: string[]
}

/**
 * Object field options
 */
export interface ObjectFieldOptions extends BaseFieldOptions {
	/** Optional schema for validation */
	schema?: unknown
}

/**
 * All field type identifiers
 */
export type FieldTypeId =
	| 'text'
	| 'number'
	| 'boolean'
	| 'date'
	| 'datetime'
	| 'richtext'
	| 'markdown'
	| 'code'
	| 'json'
	| 'select'
	| 'enum'
	| 'tags'
	| 'image'
	| 'file'
	| 'gallery'
	| 'slug'
	| 'email'
	| 'url'
	| 'phone'
	| 'address'
	| 'color'
	| 'object'
	| 'array'
	| 'blocks'
	| 'relationship'
	| 'textarea'

/**
 * Field type definition for array items
 */
export interface ArrayItemType {
	type: FieldTypeId
	options?: BaseFieldOptions
}

/**
 * Array field options - generic preserves item type
 */
export interface ArrayFieldOptions extends BaseFieldOptions {
	of: ArrayItemType
	minItems?: number
	maxItems?: number
}

/**
 * Block type definition
 */
export interface BlockTypeDefinition {
	name: string
	label: string
	fields: Record<string, FieldTypeId>
}

/**
 * Blocks field options
 */
export interface BlocksFieldOptions extends BaseFieldOptions {
	types: string[]
	maxBlocks?: number
}

/**
 * Textarea field options
 */
export interface TextareaFieldOptions extends BaseFieldOptions {
	minLength?: number
	maxLength?: number
	rows?: number
}

/**
 * Field metadata stored via reflection
 */
export interface FieldMetadata<T extends BaseFieldOptions = BaseFieldOptions> {
	/** Field type identifier */
	type: FieldTypeId
	/** Typed options for this field */
	options: T
	/** Property key */
	propertyKey: string | symbol
	/** Target class */
	target: Type<unknown>
	/** Design type from TypeScript metadata */
	designType?: unknown
}

/**
 * Map of field type IDs to their option interfaces
 */
export interface FieldOptionsMap {
	text: TextFieldOptions
	number: NumberFieldOptions
	boolean: BooleanFieldOptions
	date: DateFieldOptions
	datetime: DateTimeFieldOptions
	richtext: RichTextFieldOptions
	markdown: MarkdownFieldOptions
	code: CodeFieldOptions
	json: JSONFieldOptions
	select: SelectFieldOptions
	enum: EnumFieldOptions
	tags: TagsFieldOptions
	image: ImageFieldOptions
	file: FileFieldOptions
	gallery: GalleryFieldOptions
	slug: SlugFieldOptions
	email: EmailFieldOptions
	url: URLFieldOptions
	phone: PhoneFieldOptions
	address: AddressFieldOptions
	color: ColorFieldOptions
	object: ObjectFieldOptions
	array: ArrayFieldOptions
	blocks: BlocksFieldOptions
	relationship: RelationshipFieldOptions
	textarea: TextareaFieldOptions
}

/**
 * Type guard to check if a value is a FieldMetadata
 */
export function isFieldMetadata(value: unknown): value is FieldMetadata {
	if (typeof value !== 'object' || value === null) {
		return false
	}
	const metadata = value as Record<string, unknown>
	return (
		typeof metadata.type === 'string' &&
		typeof metadata.options === 'object' &&
		metadata.options !== null &&
		'propertyKey' in metadata
	)
}

/**
 * Type guard to check if field type is valid
 */
export function isValidFieldType(type: unknown): type is FieldTypeId {
	const validTypes: FieldTypeId[] = [
		'text',
		'number',
		'boolean',
		'date',
		'datetime',
		'richtext',
		'markdown',
		'code',
		'json',
		'select',
		'enum',
		'tags',
		'image',
		'file',
		'gallery',
		'slug',
		'email',
		'url',
		'phone',
		'address',
		'color',
		'object',
		'array',
		'blocks',
		'relationship',
		'textarea',
	]
	return typeof type === 'string' && validTypes.includes(type as FieldTypeId)
}
