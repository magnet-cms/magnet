export type SettingType = 'string' | 'boolean' | 'number' | 'object' | 'array'

/**
 * Settings object type for nested settings
 */
export interface SettingObject {
	[key: string]: SettingValue
}

/**
 * Settings value types - union of all possible setting values
 * This replaces `any` in settings-related code
 */
export type SettingValue =
	| string
	| number
	| boolean
	| string[]
	| number[]
	| SettingObject
	| null

export interface SchemaSetting {
	key: string
	value: SettingValue
	type: SettingType | string
}

export interface SettingsFeatureOptions<T = unknown> {
	group: string
	schema: new () => T
}

/**
 * Settings update payload for a single setting
 */
export interface SettingsUpdatePayload {
	group: string
	key: string
	value: SettingValue
}

/**
 * Settings bulk update payload
 */
export interface SettingsBulkUpdatePayload {
	settings: Array<{
		key: string
		value: SettingValue
	}>
}

/**
 * Settings record type for typed settings groups
 */
export type SettingsRecord = Record<string, SettingValue>

/**
 * Options for the @Settings() class decorator
 */
export interface SettingsDecoratorOptions {
	/** Unique group identifier for this settings class */
	group: string
	/** Display label in admin UI */
	label: string
	/** Icon identifier for admin UI */
	icon?: string
	/** Description of what these settings control */
	description?: string
	/** Display order in settings list */
	order?: number
}

/**
 * Base options for Setting field decorators
 */
export interface SettingFieldBaseOptions {
	/** Display label in admin UI */
	label: string
	/** Help text/description */
	description?: string
	/** Default value */
	default?: SettingValue
	/** Display order */
	order?: number
	/** Hide from admin UI */
	hidden?: boolean
	/** Make read-only in admin UI */
	readonly?: boolean
}

/**
 * Text setting field options
 */
export interface SettingTextOptions extends SettingFieldBaseOptions {
	default?: string
	minLength?: number
	maxLength?: number
	placeholder?: string
}

/**
 * Number setting field options
 */
export interface SettingNumberOptions extends SettingFieldBaseOptions {
	default?: number
	min?: number
	max?: number
	step?: number
}

/**
 * Boolean setting field options
 */
export interface SettingBooleanOptions extends SettingFieldBaseOptions {
	default?: boolean
}

/**
 * Select setting field options
 */
export interface SettingSelectOptions extends SettingFieldBaseOptions {
	options:
		| ReadonlyArray<{ label: string; value: string }>
		| ReadonlyArray<string>
	default?: string
}

/**
 * Secret setting field options (for API keys, passwords, etc.)
 */
export interface SettingSecretOptions extends SettingFieldBaseOptions {
	/** Mask value in UI (show only last 4 characters) */
	masked?: boolean
}

/**
 * Image setting field options
 */
export interface SettingImageOptions extends SettingFieldBaseOptions {
	folder?: string
	maxSize?: number
}

/**
 * JSON setting field options
 */
export interface SettingJSONOptions extends SettingFieldBaseOptions {
	default?: SettingObject
}

/**
 * Setting field type identifiers
 */
export type SettingFieldTypeId =
	| 'text'
	| 'number'
	| 'boolean'
	| 'select'
	| 'secret'
	| 'image'
	| 'json'
	| 'textarea'

/**
 * Setting field metadata stored via reflection
 */
export interface SettingFieldMetadata<
	T extends SettingFieldBaseOptions = SettingFieldBaseOptions,
> {
	/** Field type identifier */
	type: SettingFieldTypeId
	/** Typed options for this field */
	options: T
	/** Property key */
	propertyKey: string | symbol
}

/**
 * Type guard to check if a value is SettingFieldMetadata
 */
export function isSettingFieldMetadata(
	value: unknown,
): value is SettingFieldMetadata {
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
