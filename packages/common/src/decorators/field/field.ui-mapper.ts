import type {
	BaseFieldOptions,
	BooleanFieldOptions,
	EnumFieldOptions,
	FieldTypeId,
	SelectFieldOptions,
	SelectOptionItem,
	TagsFieldOptions,
} from '~/types/field.types'
import type {
	UIDecoratorOptions,
	UISelectItem,
	UITypes,
} from '~/types/ui.types'

/**
 * Map field type to UI type identifier
 */
function mapFieldTypeToUIType(type: FieldTypeId): UITypes {
	const typeMap: Record<FieldTypeId, UITypes> = {
		text: 'text',
		number: 'number',
		boolean: 'switch',
		date: 'date',
		datetime: 'date',
		richtext: 'richText',
		markdown: 'textarea',
		code: 'code',
		json: 'json',
		select: 'select',
		enum: 'select',
		tags: 'multiSelect',
		image: 'upload',
		file: 'fileUpload',
		gallery: 'upload',
		slug: 'text',
		email: 'email',
		url: 'text',
		phone: 'phone',
		address: 'text',
		color: 'text',
		object: 'json',
		array: 'array',
		blocks: 'blocks',
		relationship: 'relationship',
		textarea: 'textarea',
	}
	return typeMap[type]
}

/**
 * Convert field options to UISelectItem format
 */
function convertToUISelectItems<T extends string | number>(
	options: ReadonlyArray<SelectOptionItem<T>> | ReadonlyArray<T>,
): UISelectItem[] {
	return options.map((opt) => {
		if (
			typeof opt === 'object' &&
			opt !== null &&
			'label' in opt &&
			'value' in opt
		) {
			return {
				key: String(opt.value),
				value: opt.label,
			}
		}
		return {
			key: String(opt),
			value: String(opt),
		}
	})
}

/**
 * Convert enum to UISelectItem format
 */
function convertEnumToUISelectItems<E extends Record<string, string | number>>(
	enumObj: E,
): UISelectItem[] {
	return Object.entries(enumObj)
		.filter(([key]) => Number.isNaN(Number(key))) // Filter out numeric keys from reverse mapping
		.map(([key, value]) => ({
			key: String(value),
			value: key,
		}))
}

/**
 * Internal UI options structure that can be converted to UIDecoratorOptions
 */
interface InternalUIOptions {
	type: UITypes
	label?: string
	description?: string
	tab?: string
	side?: true
	options?: UISelectItem[]
	row?: boolean
	collapsible?: boolean
}

/**
 * Convert internal options to proper UIDecoratorOptions
 */
function toUIDecoratorOptions(internal: InternalUIOptions): UIDecoratorOptions {
	// If side is true, return as UISide
	if (internal.side) {
		return {
			type: internal.type,
			label: internal.label,
			description: internal.description,
			side: true,
			options: internal.options,
		} as UIDecoratorOptions
	}

	// Otherwise return as UITab (tab defaults to 'General' if not specified)
	const result: UIDecoratorOptions = {
		type: internal.type,
		label: internal.label,
		description: internal.description,
		tab: internal.tab ?? 'General',
	}

	// Add options if present (for select/multiSelect)
	if (internal.options) {
		;(result as { options: UISelectItem[] }).options = internal.options
	}

	return result
}

/**
 * Map field type and options to legacy UI decorator options.
 * This ensures backwards compatibility with existing admin UI.
 */
export function mapFieldTypeToUI(
	type: FieldTypeId,
	options: BaseFieldOptions,
): UIDecoratorOptions {
	const uiType = mapFieldTypeToUIType(type)

	// Build base internal UI options
	const internal: InternalUIOptions = {
		type: uiType,
		label: options.label,
		description: options.description,
		tab: options.tab,
		side: options.side ? true : undefined,
	}

	// Handle type-specific options
	switch (type) {
		case 'select': {
			const selectOpts = options as SelectFieldOptions
			return toUIDecoratorOptions({
				...internal,
				type: selectOpts.multiple ? 'multiSelect' : 'select',
				options: convertToUISelectItems(selectOpts.options),
			})
		}

		case 'enum': {
			const enumOpts = options as EnumFieldOptions
			return toUIDecoratorOptions({
				...internal,
				type: enumOpts.multiple ? 'multiSelect' : 'select',
				options: convertEnumToUISelectItems(enumOpts.enum),
			})
		}

		case 'boolean': {
			const boolOpts = options as BooleanFieldOptions
			return toUIDecoratorOptions({
				...internal,
				type: boolOpts.style === 'checkbox' ? 'checkbox' : 'switch',
			})
		}

		case 'richtext': {
			return toUIDecoratorOptions({
				...internal,
				type: 'richText',
			})
		}

		case 'code': {
			return toUIDecoratorOptions({
				...internal,
				type: 'code',
			})
		}

		case 'tags': {
			const tagsOpts = options as TagsFieldOptions
			return toUIDecoratorOptions({
				...internal,
				type: 'multiSelect',
				options: tagsOpts.suggestions?.map((s) => ({ key: s, value: s })),
			})
		}

		default:
			return toUIDecoratorOptions(internal)
	}
}
