import type {
	AddressFieldOptions,
	ArrayFieldOptions,
	BlocksFieldOptions,
	BooleanFieldOptions,
	CodeFieldOptions,
	ColorFieldOptions,
	DateFieldOptions,
	DateTimeFieldOptions,
	EmailFieldOptions,
	EnumFieldOptions,
	FileFieldOptions,
	GalleryFieldOptions,
	ImageFieldOptions,
	JSONFieldOptions,
	MarkdownFieldOptions,
	NumberFieldOptions,
	ObjectFieldOptions,
	PhoneFieldOptions,
	RelationshipFieldOptions,
	RichTextFieldOptions,
	SelectFieldOptions,
	SlugFieldOptions,
	TagsFieldOptions,
	TextFieldOptions,
	TextareaFieldOptions,
	URLFieldOptions,
} from '~/types/field.types'
import { Validators as BaseValidators } from '../schema/validators.decorator'
import {
	createFieldDecorator,
	getFieldMetadata,
	getFieldMetadataForProperty,
} from './field.factory'

/**
 * Field decorator namespace with full type safety.
 *
 * Each decorator combines @Prop and @UI functionality into a single,
 * semantic decorator. Validation remains explicit via Field.Validators().
 *
 * @example
 * ```typescript
 * @Schema({ slug: 'posts' })
 * export class Post {
 *   @Field.Text({ required: true, tab: 'General' })
 *   @Field.Validators(IsString(), Length(1, 200))
 *   title: string
 *
 *   @Field.Slug({ from: 'title', unique: true })
 *   slug: string
 *
 *   @Field.RichText({ toolbar: 'full' })
 *   content?: string
 *
 *   @Field.Relationship({ ref: 'users', multiple: false })
 *   author: string
 * }
 * ```
 */
export const Field = {
	// ============================================
	// PRIMITIVES
	// ============================================

	/**
	 * Text field - single line text input
	 *
	 * @example
	 * ```typescript
	 * @Field.Text({ required: true, maxLength: 200 })
	 * title: string
	 * ```
	 */
	Text: createFieldDecorator<TextFieldOptions>('text'),

	/**
	 * Number field - numeric input
	 *
	 * @example
	 * ```typescript
	 * @Field.Number({ min: 0, max: 100, integer: true })
	 * quantity: number
	 * ```
	 */
	Number: createFieldDecorator<NumberFieldOptions>('number'),

	/**
	 * Boolean field - true/false toggle
	 *
	 * @example
	 * ```typescript
	 * @Field.Boolean({ default: false, style: 'switch' })
	 * isPublished: boolean
	 * ```
	 */
	Boolean: createFieldDecorator<BooleanFieldOptions>('boolean', {
		style: 'switch',
	}),

	/**
	 * Date field - date picker (without time)
	 *
	 * @example
	 * ```typescript
	 * @Field.Date({ min: '2024-01-01' })
	 * publishDate: Date
	 * ```
	 */
	Date: createFieldDecorator<DateFieldOptions>('date'),

	/**
	 * DateTime field - date and time picker
	 *
	 * @example
	 * ```typescript
	 * @Field.DateTime({ timezone: 'UTC' })
	 * scheduledAt: Date
	 * ```
	 */
	DateTime: createFieldDecorator<DateTimeFieldOptions>('datetime'),

	// ============================================
	// RICH CONTENT
	// ============================================

	/**
	 * RichText field - WYSIWYG editor
	 *
	 * @example
	 * ```typescript
	 * @Field.RichText({ toolbar: 'full' })
	 * content: string
	 * ```
	 */
	RichText: createFieldDecorator<RichTextFieldOptions>('richtext', {
		toolbar: 'standard',
	}),

	/**
	 * Markdown field - markdown editor with preview
	 *
	 * @example
	 * ```typescript
	 * @Field.Markdown({ preview: true })
	 * description: string
	 * ```
	 */
	Markdown: createFieldDecorator<MarkdownFieldOptions>('markdown', {
		preview: true,
	}),

	/**
	 * Code field - code editor with syntax highlighting
	 *
	 * @example
	 * ```typescript
	 * @Field.Code({ language: 'typescript' })
	 * snippet: string
	 * ```
	 */
	Code: createFieldDecorator<CodeFieldOptions>('code'),

	/**
	 * JSON field - JSON editor
	 *
	 * @example
	 * ```typescript
	 * @Field.JSON()
	 * metadata: Record<string, unknown>
	 * ```
	 */
	JSON: createFieldDecorator<JSONFieldOptions>('json'),

	/**
	 * Textarea field - multi-line text input
	 *
	 * @example
	 * ```typescript
	 * @Field.Textarea({ rows: 5 })
	 * summary: string
	 * ```
	 */
	Textarea: createFieldDecorator<TextareaFieldOptions>('textarea'),

	// ============================================
	// SELECTION
	// ============================================

	/**
	 * Select field - dropdown selection
	 *
	 * @example
	 * ```typescript
	 * @Field.Select({
	 *   options: [
	 *     { label: 'Draft', value: 'draft' },
	 *     { label: 'Published', value: 'published' }
	 *   ],
	 *   default: 'draft'
	 * })
	 * status: string
	 * ```
	 */
	Select: <T extends string | number = string>(
		options: SelectFieldOptions<T>,
	): PropertyDecorator =>
		createFieldDecorator<SelectFieldOptions<T>>('select')(options),

	/**
	 * Enum field - dropdown from TypeScript enum
	 *
	 * @example
	 * ```typescript
	 * enum Status { Draft = 'draft', Published = 'published' }
	 *
	 * @Field.Enum({ enum: Status, default: Status.Draft })
	 * status: Status
	 * ```
	 */
	Enum: <E extends Record<string, string | number>>(
		options: EnumFieldOptions<E>,
	): PropertyDecorator =>
		createFieldDecorator<EnumFieldOptions<E>>('enum')(options),

	/**
	 * Tags field - multi-value tag input
	 *
	 * @example
	 * ```typescript
	 * @Field.Tags({ suggestions: ['tech', 'news'], maxTags: 5 })
	 * tags: string[]
	 * ```
	 */
	Tags: createFieldDecorator<TagsFieldOptions>('tags'),

	// ============================================
	// MEDIA
	// ============================================

	/**
	 * Image field - single image upload
	 *
	 * @example
	 * ```typescript
	 * @Field.Image({ folder: 'covers', formats: ['jpg', 'png', 'webp'] })
	 * coverImage: string
	 * ```
	 */
	Image: createFieldDecorator<ImageFieldOptions>('image'),

	/**
	 * File field - single file upload
	 *
	 * @example
	 * ```typescript
	 * @Field.File({ folder: 'documents', accept: ['application/pdf'] })
	 * attachment: string
	 * ```
	 */
	File: createFieldDecorator<FileFieldOptions>('file'),

	/**
	 * Gallery field - multiple image upload
	 *
	 * @example
	 * ```typescript
	 * @Field.Gallery({ maxItems: 10 })
	 * images: string[]
	 * ```
	 */
	Gallery: createFieldDecorator<GalleryFieldOptions>('gallery'),

	// ============================================
	// SPECIAL
	// ============================================

	/**
	 * Slug field - auto-generated URL-friendly string
	 *
	 * @example
	 * ```typescript
	 * @Field.Slug({ from: 'title', unique: true })
	 * slug: string
	 * ```
	 */
	Slug: createFieldDecorator<SlugFieldOptions>('slug'),

	/**
	 * Email field - email input with validation pattern
	 *
	 * @example
	 * ```typescript
	 * @Field.Email({ required: true })
	 * @Field.Validators(IsEmail())
	 * email: string
	 * ```
	 */
	Email: createFieldDecorator<EmailFieldOptions>('email', {
		pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
	}),

	/**
	 * URL field - URL input
	 *
	 * @example
	 * ```typescript
	 * @Field.URL({ protocols: ['https'] })
	 * @Field.Validators(IsUrl())
	 * website: string
	 * ```
	 */
	URL: createFieldDecorator<URLFieldOptions>('url'),

	/**
	 * Phone field - phone number input
	 *
	 * @example
	 * ```typescript
	 * @Field.Phone({ defaultCountry: 'US' })
	 * phone: string
	 * ```
	 */
	Phone: createFieldDecorator<PhoneFieldOptions>('phone'),

	/**
	 * Address field - address input with optional geocoding
	 *
	 * @example
	 * ```typescript
	 * @Field.Address({ provider: 'google' })
	 * address: string
	 * ```
	 */
	Address: createFieldDecorator<AddressFieldOptions>('address'),

	/**
	 * Color field - color picker
	 *
	 * @example
	 * ```typescript
	 * @Field.Color({ format: 'hex', presets: ['#ff0000', '#00ff00'] })
	 * brandColor: string
	 * ```
	 */
	Color: createFieldDecorator<ColorFieldOptions>('color', {
		format: 'hex',
	}),

	// ============================================
	// COMPOSITION
	// ============================================

	/**
	 * Object field - nested object structure
	 *
	 * @example
	 * ```typescript
	 * @Field.Object()
	 * metadata: { key: string; value: string }
	 * ```
	 */
	Object: createFieldDecorator<ObjectFieldOptions>('object'),

	/**
	 * Array field - array of items
	 *
	 * @example
	 * ```typescript
	 * @Field.Array({ of: { type: 'text' }, maxItems: 10 })
	 * items: string[]
	 * ```
	 */
	Array: (options: ArrayFieldOptions): PropertyDecorator =>
		createFieldDecorator<ArrayFieldOptions>('array')(options),

	/**
	 * Blocks field - flexible content blocks
	 *
	 * @example
	 * ```typescript
	 * @Field.Blocks({ types: ['paragraph', 'image', 'quote'] })
	 * content: Block[]
	 * ```
	 */
	Blocks: createFieldDecorator<BlocksFieldOptions>('blocks'),

	/**
	 * Relationship field - reference to another schema
	 *
	 * @example
	 * ```typescript
	 * @Field.Relationship({ ref: 'users', multiple: false })
	 * author: string
	 *
	 * @Field.Relationship({ ref: 'categories', multiple: true })
	 * categories: string[]
	 * ```
	 */
	Relationship: createFieldDecorator<RelationshipFieldOptions>('relationship'),

	// ============================================
	// VALIDATION
	// ============================================

	/**
	 * Validators - apply class-validator decorators
	 *
	 * This is an alias for the existing @Validators decorator,
	 * keeping validation explicit and using familiar class-validator syntax.
	 *
	 * @example
	 * ```typescript
	 * @Field.Text({ required: true })
	 * @Field.Validators(IsString(), Length(1, 200), IsNotEmpty())
	 * title: string
	 * ```
	 */
	Validators: BaseValidators,
} as const

/**
 * Type for the Field namespace
 */
export type FieldNamespace = typeof Field

// Re-export utilities
export { getFieldMetadata, getFieldMetadataForProperty }
export { createFieldDecorator } from './field.factory'
export { mapFieldTypeToProp } from './field.prop-mapper'
export { mapFieldTypeToUI } from './field.ui-mapper'

// Re-export types and type guards
export {
	isFieldMetadata,
	isValidFieldType,
} from '~/types/field.types'

export type {
	BaseFieldOptions,
	TextFieldOptions,
	NumberFieldOptions,
	BooleanFieldOptions,
	DateFieldOptions,
	DateTimeFieldOptions,
	RichTextFieldOptions,
	MarkdownFieldOptions,
	CodeFieldOptions,
	JSONFieldOptions,
	SelectFieldOptions,
	EnumFieldOptions,
	TagsFieldOptions,
	ImageFieldOptions,
	FileFieldOptions,
	GalleryFieldOptions,
	SlugFieldOptions,
	EmailFieldOptions,
	URLFieldOptions,
	PhoneFieldOptions,
	AddressFieldOptions,
	ColorFieldOptions,
	ObjectFieldOptions,
	ArrayFieldOptions,
	BlocksFieldOptions,
	RelationshipFieldOptions,
	TextareaFieldOptions,
	FieldTypeId,
	FieldMetadata,
} from '~/types/field.types'
