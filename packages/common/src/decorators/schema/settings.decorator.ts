import {
	SETTINGS_OPTIONS_METADATA_KEY,
	SETTING_FIELD_METADATA_KEY,
	SETTING_METADATA_KEY,
} from '~/constants'
import type {
	SettingBooleanOptions,
	SettingFieldBaseOptions,
	SettingFieldMetadata,
	SettingFieldTypeId,
	SettingImageOptions,
	SettingJSONOptions,
	SettingNumberOptions,
	SettingSecretOptions,
	SettingSelectOptions,
	SettingTextOptions,
	SettingsDecoratorOptions,
} from '~/types/settings.types'

/**
 * Enhanced Settings class decorator.
 *
 * Marks a class as a settings schema with group, label, and icon configuration.
 *
 * @example
 * ```typescript
 * @Settings({ group: 'general', label: 'General Settings', icon: 'settings' })
 * export class GeneralSettings {
 *   @SettingField.Text({ label: 'Site Name' })
 *   siteName: string = 'My Site'
 *
 *   @SettingField.Boolean({ label: 'Maintenance Mode' })
 *   maintenanceMode: boolean = false
 * }
 * ```
 */
export function Settings(options: SettingsDecoratorOptions): ClassDecorator {
	return (target) => {
		// Mark as a settings class
		Reflect.defineMetadata(SETTING_METADATA_KEY, true, target)

		// Store the settings options
		Reflect.defineMetadata(SETTINGS_OPTIONS_METADATA_KEY, options, target)
	}
}

/**
 * Get settings options from a class
 */
export function getSettingsOptions(
	target: Function,
): SettingsDecoratorOptions | undefined {
	return Reflect.getMetadata(SETTINGS_OPTIONS_METADATA_KEY, target)
}

/**
 * Get all setting field metadata from a class
 */
export function getSettingFields(target: Function): SettingFieldMetadata[] {
	return Reflect.getMetadata(SETTING_FIELD_METADATA_KEY, target) ?? []
}

/**
 * Create a setting field decorator
 */
function createSettingFieldDecorator<T extends SettingFieldBaseOptions>(
	type: SettingFieldTypeId,
	defaultOptions: Partial<T> = {},
): (options: T) => PropertyDecorator {
	return (options: T): PropertyDecorator => {
		const mergedOptions = { ...defaultOptions, ...options }

		return (target: object, propertyKey: string | symbol): void => {
			const metadata: SettingFieldMetadata<T> = {
				type,
				options: mergedOptions,
				propertyKey,
			}

			// Get existing field metadata or create new array
			const existingFields: SettingFieldMetadata[] =
				Reflect.getMetadata(SETTING_FIELD_METADATA_KEY, target.constructor) ??
				[]

			// Filter out existing entry for this property and add new one
			const filteredFields = existingFields.filter(
				(f) => f.propertyKey !== propertyKey,
			)

			Reflect.defineMetadata(
				SETTING_FIELD_METADATA_KEY,
				[...filteredFields, metadata],
				target.constructor,
			)
		}
	}
}

/**
 * SettingField decorator namespace.
 *
 * Provides type-safe field decorators for settings classes.
 *
 * @example
 * ```typescript
 * @Settings({ group: 'email', label: 'Email Settings', icon: 'mail' })
 * export class EmailSettings {
 *   @SettingField.Select({
 *     label: 'Provider',
 *     options: ['smtp', 'sendgrid', 'resend'],
 *     default: 'smtp'
 *   })
 *   provider: string = 'smtp'
 *
 *   @SettingField.Secret({ label: 'API Key', masked: true })
 *   apiKey?: string
 * }
 * ```
 */
export const SettingField = {
	/**
	 * Text setting field
	 */
	Text: createSettingFieldDecorator<SettingTextOptions>('text'),

	/**
	 * Number setting field
	 */
	Number: createSettingFieldDecorator<SettingNumberOptions>('number'),

	/**
	 * Boolean setting field (toggle/switch)
	 */
	Boolean: createSettingFieldDecorator<SettingBooleanOptions>('boolean'),

	/**
	 * Select setting field (dropdown)
	 */
	Select: createSettingFieldDecorator<SettingSelectOptions>('select'),

	/**
	 * Secret setting field (encrypted, masked in UI)
	 */
	Secret: createSettingFieldDecorator<SettingSecretOptions>('secret', {
		masked: true,
	}),

	/**
	 * Image setting field
	 */
	Image: createSettingFieldDecorator<SettingImageOptions>('image'),

	/**
	 * JSON setting field
	 */
	JSON: createSettingFieldDecorator<SettingJSONOptions>('json'),

	/**
	 * Textarea setting field (multi-line text)
	 */
	Textarea: createSettingFieldDecorator<SettingTextOptions>('textarea'),
} as const

/**
 * Type for the SettingField namespace
 */
export type SettingFieldNamespace = typeof SettingField
