import type { Type } from '@nestjs/common'
import {
	DESIGN_TYPE,
	FIELD_METADATA_KEY,
	PROP_METADATA_KEY,
	UI_METADATA_KEY,
} from '~/constants'
import type {
	BaseFieldOptions,
	FieldMetadata,
	FieldTypeId,
} from '~/types/field.types'
import { detectDatabaseAdapter } from '~/utils'
import { mapFieldTypeToProp } from './field.prop-mapper'
import { mapFieldTypeToUI } from './field.ui-mapper'

/**
 * Type-safe field decorator factory.
 *
 * Creates a property decorator that:
 * 1. Stores field metadata under FIELD_METADATA_KEY
 * 2. Emits legacy Prop metadata for backwards compatibility
 * 3. Emits legacy UI metadata for backwards compatibility
 * 4. Applies the adapter-specific Prop decorator
 *
 * @param type - The field type identifier
 * @param defaultOptions - Default options to merge with user-provided options
 * @returns A function that creates a PropertyDecorator
 */
export function createFieldDecorator<T extends BaseFieldOptions>(
	type: FieldTypeId,
	defaultOptions: Partial<T> = {},
): (options?: T) => PropertyDecorator {
	return (options?: T): PropertyDecorator => {
		const mergedOptions = { ...defaultOptions, ...options } as T

		return (target: object, propertyKey: string | symbol): void => {
			// Get design type from TypeScript metadata
			const designType = Reflect.getMetadata(DESIGN_TYPE, target, propertyKey)

			// Store typed field metadata
			const metadata: FieldMetadata<T> = {
				type,
				options: mergedOptions,
				propertyKey,
				target: target.constructor as Type<unknown>,
				designType,
			}

			// Get existing field metadata array or create new
			const existingFields: FieldMetadata[] =
				Reflect.getMetadata(FIELD_METADATA_KEY, target.constructor) ?? []

			// Check if this property already has field metadata (replace it)
			const filteredFields = existingFields.filter(
				(f) => f.propertyKey !== propertyKey,
			)

			Reflect.defineMetadata(
				FIELD_METADATA_KEY,
				[...filteredFields, metadata],
				target.constructor,
			)

			// Emit legacy Prop metadata for backwards compatibility
			emitLegacyPropMetadata(target, propertyKey, type, mergedOptions)

			// Emit legacy UI metadata for backwards compatibility
			emitLegacyUIMetadata(target, propertyKey, type, mergedOptions, designType)

			// Apply adapter-specific Prop decorator
			applyAdapterProp(target, propertyKey, type, mergedOptions)
		}
	}
}

/**
 * Store legacy Prop metadata for backwards compatibility with existing code.
 */
function emitLegacyPropMetadata(
	target: object,
	propertyKey: string | symbol,
	type: FieldTypeId,
	options: BaseFieldOptions,
): void {
	const propOptions = mapFieldTypeToProp(type, options)

	const existingProps: Array<{
		propertyKey: string | symbol
		options: unknown
	}> = Reflect.getMetadata(PROP_METADATA_KEY, target) ?? []

	// Filter out existing entry for this property
	const filteredProps = existingProps.filter(
		(p) => p.propertyKey !== propertyKey,
	)

	Reflect.defineMetadata(
		PROP_METADATA_KEY,
		[...filteredProps, { propertyKey, options: propOptions }],
		target,
	)
}

/**
 * Store legacy UI metadata for backwards compatibility with existing admin UI.
 */
function emitLegacyUIMetadata(
	target: object,
	propertyKey: string | symbol,
	type: FieldTypeId,
	options: BaseFieldOptions,
	designType: unknown,
): void {
	const uiOptions = mapFieldTypeToUI(type, options)

	interface UIFieldMetadataEntry {
		propertyKey: string | symbol
		options: unknown
	}

	const existingUI: UIFieldMetadataEntry[] =
		Reflect.getMetadata(UI_METADATA_KEY, target) ?? []

	// Filter out existing entry for this property
	const filteredUI = existingUI.filter((u) => u.propertyKey !== propertyKey)

	Reflect.defineMetadata(
		UI_METADATA_KEY,
		[...filteredUI, { propertyKey, options: { ...uiOptions, designType } }],
		target,
	)
}

/**
 * Apply adapter-specific Prop decorator for database schema generation.
 */
function applyAdapterProp(
	target: object,
	propertyKey: string | symbol,
	type: FieldTypeId,
	options: BaseFieldOptions,
): void {
	try {
		const adapter = detectDatabaseAdapter()
		const propOptions = mapFieldTypeToProp(type, options)

		// Dynamically require the adapter-specific Prop decorator
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { Prop } = require(`@magnet-cms/adapter-${adapter}`)
		Prop(propOptions)(target, propertyKey)
	} catch {
		// Adapter not available, skip adapter-specific decoration
		// This allows using decorators in tests without full adapter setup
	}
}

/**
 * Get all field metadata for a class.
 *
 * @param target - The class constructor
 * @returns Array of field metadata entries
 */
export function getFieldMetadata(target: Type<unknown>): FieldMetadata[] {
	return Reflect.getMetadata(FIELD_METADATA_KEY, target) ?? []
}

/**
 * Get field metadata for a specific property.
 *
 * @param target - The class constructor
 * @param propertyKey - The property name
 * @returns The field metadata or undefined
 */
export function getFieldMetadataForProperty(
	target: Type<unknown>,
	propertyKey: string | symbol,
): FieldMetadata | undefined {
	const fields = getFieldMetadata(target)
	return fields.find((f) => f.propertyKey === propertyKey)
}
