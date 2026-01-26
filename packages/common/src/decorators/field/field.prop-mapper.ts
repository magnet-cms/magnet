import type { PropDefaultValue, PropOptions } from '~/types/decorator.types'
import type {
	BaseFieldOptions,
	FieldTypeId,
	RelationshipFieldOptions,
} from '~/types/field.types'

/**
 * Check if a value is a valid PropDefaultValue
 */
function isPropDefaultValue(value: unknown): value is PropDefaultValue {
	if (value === null) return true
	if (typeof value === 'string') return true
	if (typeof value === 'number') return true
	if (typeof value === 'boolean') return true
	if (typeof value === 'function') return true
	if (Array.isArray(value)) return true
	if (typeof value === 'object') return true
	return false
}

/**
 * Map field type and options to legacy Prop decorator options.
 * This ensures backwards compatibility with existing adapters.
 */
export function mapFieldTypeToProp(
	type: FieldTypeId,
	options: BaseFieldOptions,
): PropOptions {
	const propOptions: PropOptions = {
		required: options.required,
		unique: options.unique,
		default: isPropDefaultValue(options.default) ? options.default : undefined,
		hidden: options.hidden,
		readonly: options.readonly,
		description: options.description,
	}

	// Map field type to appropriate prop type configuration
	switch (type) {
		case 'text':
		case 'email':
		case 'url':
		case 'phone':
		case 'address':
		case 'color':
		case 'slug':
		case 'textarea':
		case 'markdown':
		case 'code':
			propOptions.type = String
			break

		case 'number':
			propOptions.type = Number
			break

		case 'boolean':
			propOptions.type = Boolean
			break

		case 'date':
		case 'datetime':
			propOptions.type = Date
			break

		case 'richtext':
			propOptions.type = String
			break

		case 'json':
		case 'object':
			// JSON/Object fields are stored as mixed type
			propOptions.type = Object
			break

		case 'select':
		case 'enum':
			propOptions.type = String
			break

		case 'tags':
			propOptions.type = [String]
			break

		case 'image':
		case 'file':
			propOptions.type = String
			break

		case 'gallery':
			propOptions.type = [String]
			break

		case 'array':
			propOptions.type = Array
			break

		case 'blocks':
			propOptions.type = Array
			break

		case 'relationship': {
			const relOptions = options as RelationshipFieldOptions
			propOptions.ref = relOptions.ref
			if (relOptions.multiple) {
				propOptions.type = [String]
			} else {
				propOptions.type = String
			}
			break
		}

		default: {
			// Ensure exhaustive type checking
			const _exhaustiveCheck: never = type
			throw new Error(`Unknown field type: ${_exhaustiveCheck}`)
		}
	}

	// Remove undefined values
	return Object.fromEntries(
		Object.entries(propOptions).filter(([, value]) => value !== undefined),
	) as PropOptions
}
