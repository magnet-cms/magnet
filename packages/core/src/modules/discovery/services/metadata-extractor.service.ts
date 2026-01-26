import {
	ControllerMetadata,
	DESIGN_TYPE,
	FIELD_METADATA_KEY,
	type FieldMetadata,
	MethodMetadata,
	PROP_METADATA_KEY,
	RESOLVE_METADATA_KEY,
	SchemaMetadata,
	UIFieldMetadata,
	UI_METADATA_KEY,
	getSchemaOptions,
	isFieldMetadata,
} from '@magnet-cms/common'
import { Injectable, RequestMethod, Type } from '@nestjs/common'
import {
	PARAMTYPES_METADATA,
	PATH_METADATA,
	ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants'
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum'
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper'
import { getMetadataStorage } from 'class-validator'
import { requestMethodMap } from '../constants'

@Injectable()
export class MetadataExtractorService {
	extractControllerMetadata(wrapper: InstanceWrapper<any>): ControllerMetadata {
		const { instance, metatype } = wrapper
		if (!metatype || typeof metatype !== 'function')
			return { name: 'UnknownController', basePath: '', methods: [] }

		const basePath = Reflect.getMetadata(PATH_METADATA, metatype) ?? ''

		const methods = instance
			? Object.getOwnPropertyNames(metatype.prototype)
					.filter((method) => method !== 'constructor')
					.map((method) => this.extractMethodMetadata(instance, method))
					.filter((metadata) => metadata !== null)
			: []

		return {
			name: metatype.name.toLowerCase() ?? 'unknowncontroller',
			basePath,
			methods,
		}
	}

	extractMethodMetadata(instance: any, method: string): MethodMetadata | null {
		const methodRef = instance[method]
		if (!methodRef) return null

		const httpMethodNumber = Reflect.getMetadata('method', methodRef)
		const httpMethod =
			requestMethodMap[httpMethodNumber as RequestMethod] || 'UNKNOWN'

		const resolveMetadata = Reflect.getMetadata(RESOLVE_METADATA_KEY, methodRef)

		let returnType: MethodMetadata['returnType'] = {
			type: Object as Type,
			isArray: false,
		}

		if (resolveMetadata) {
			if (resolveMetadata.type) {
				const isArray =
					Array.isArray(resolveMetadata.type) ||
					(typeof resolveMetadata.type === 'function' &&
						resolveMetadata.isArray)

				const extractedType = Array.isArray(resolveMetadata.type)
					? resolveMetadata.type[0].name
					: resolveMetadata.type.name

				returnType = {
					type: extractedType,
					isArray,
				}
			}
		}

		return {
			name: method.toLowerCase(),
			returnType,
			params: this.getParamDetails(instance.constructor, method),
			httpMethod,
			routePath: Reflect.getMetadata('path', methodRef) ?? '',
			guards: Reflect.getMetadata('guards', methodRef) || [],
			interceptors: Reflect.getMetadata('interceptors', methodRef) || [],
			pipes: Reflect.getMetadata('pipes', methodRef) || [],
		}
	}

	extractSchemaMetadata(
		wrapper: InstanceWrapper<unknown>,
	): SchemaMetadata | null {
		const { metatype } = wrapper
		if (!metatype || typeof metatype !== 'function') return null

		// Check for new Field metadata first (from @Field.* decorators)
		const fieldMetadata: unknown[] =
			Reflect.getMetadata(FIELD_METADATA_KEY, metatype) ?? []

		// Fall back to legacy Prop/UI metadata
		const schemaProps: Array<{
			propertyKey: string
			options?: Record<string, unknown>
		}> = Reflect.getMetadata(PROP_METADATA_KEY, metatype.prototype) ?? []
		const uiMetadata: UIFieldMetadata[] =
			Reflect.getMetadata(UI_METADATA_KEY, metatype.prototype) ?? []

		// Build a set of property keys that have Field metadata
		const fieldPropertyKeys = new Set(
			fieldMetadata.filter(isFieldMetadata).map((f) => String(f.propertyKey)),
		)

		// Process properties - prefer Field metadata when available
		const properties = this.buildProperties(
			metatype,
			fieldMetadata,
			schemaProps,
			uiMetadata,
			fieldPropertyKeys,
		)

		// Convert PascalCase className to kebab-case for routes (e.g., "MedicalRecord" -> "medical-record")
		const kebabName = metatype.name
			.replace(/([a-z])([A-Z])/g, '$1-$2')
			.toLowerCase()

		// Convert kebab-case to title case for display (e.g., "medical-record" -> "Medical Record")
		const displayName = kebabName
			.split('-')
			.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ')

		return {
			name: metatype.name.toLowerCase() ?? 'unknownschema',
			className: metatype.name, // Store original class name for token lookup
			apiName: kebabName, // kebab-case for routes
			displayName, // Title case for display
			properties,
			options: getSchemaOptions(metatype),
		}
	}

	/**
	 * Build schema properties from both Field metadata and legacy Prop/UI metadata.
	 * Field metadata takes precedence when available.
	 */
	private buildProperties(
		metatype: Function,
		fieldMetadata: unknown[],
		schemaProps: Array<{
			propertyKey: string
			options?: Record<string, unknown>
		}>,
		uiMetadata: UIFieldMetadata[],
		fieldPropertyKeys: Set<string>,
	): SchemaMetadata['properties'] {
		const properties: SchemaMetadata['properties'] = []

		// Process Field metadata first (new system)
		for (const meta of fieldMetadata) {
			if (!isFieldMetadata(meta)) continue

			const propertyKey = String(meta.propertyKey)
			const designTypeMetadata = Reflect.getMetadata(
				DESIGN_TYPE,
				metatype.prototype,
				propertyKey,
			)

			properties.push({
				name: propertyKey,
				type: this.getTypeNameFromFieldMetadata(meta, designTypeMetadata),
				isArray: this.isArrayField(meta),
				unique: Boolean(meta.options.unique),
				required: Boolean(meta.options.required),
				validations: this.getValidationMetadata(metatype, propertyKey),
				ui: this.buildUIFromFieldMetadata(meta),
				ref: this.getRefFromFieldMetadata(meta),
			})
		}

		// Process legacy Prop/UI metadata for properties not covered by Field metadata
		for (const prop of schemaProps) {
			if (fieldPropertyKeys.has(prop.propertyKey)) continue // Skip if already processed

			const uiField = uiMetadata.find(
				(ui) => ui.propertyKey === prop.propertyKey,
			)

			const designTypeMetadata = Reflect.getMetadata(
				DESIGN_TYPE,
				metatype.prototype,
				prop.propertyKey,
			)

			const typeName = this.getTypeName(prop.options?.type, designTypeMetadata)

			properties.push({
				name: prop.propertyKey,
				type: typeName,
				isArray: Array.isArray(prop.options?.type),
				unique: Boolean(prop.options?.unique),
				required: Boolean(prop.options?.required),
				validations: this.getValidationMetadata(metatype, prop.propertyKey),
				ui: uiField?.options,
				ref: prop.options?.ref as string | undefined,
			})
		}

		return properties
	}

	/**
	 * Get the type name from field metadata
	 */
	private getTypeNameFromFieldMetadata(
		meta: FieldMetadata,
		designType: unknown,
	): string {
		// Map field type to a display-friendly type name
		const typeMap: Record<string, string> = {
			text: 'String',
			number: 'Number',
			boolean: 'Boolean',
			date: 'Date',
			datetime: 'Date',
			richtext: 'String',
			markdown: 'String',
			code: 'String',
			json: 'Object',
			select: 'String',
			enum: 'String',
			tags: 'Array',
			image: 'String',
			file: 'String',
			gallery: 'Array',
			slug: 'String',
			email: 'String',
			url: 'String',
			phone: 'String',
			address: 'String',
			color: 'String',
			object: 'Object',
			array: 'Array',
			blocks: 'Array',
			relationship: 'String',
			textarea: 'String',
		}

		return typeMap[meta.type] ?? this.getTypeName(undefined, designType)
	}

	/**
	 * Get type name from a type constructor or design type
	 */
	private getTypeName(type: unknown, designType: unknown): string {
		if (type && typeof type === 'function' && 'name' in type) {
			return type.name as string
		}
		if (Array.isArray(type) && type[0] && typeof type[0] === 'function') {
			return (type[0] as { name: string }).name
		}
		if (
			designType &&
			typeof designType === 'function' &&
			'name' in designType
		) {
			return designType.name as string
		}
		return 'unknown'
	}

	/**
	 * Check if a field is an array type
	 */
	private isArrayField(meta: FieldMetadata): boolean {
		const arrayTypes = ['tags', 'gallery', 'array', 'blocks']
		if (arrayTypes.includes(meta.type)) return true

		// Check for relationship with multiple
		if (
			meta.type === 'relationship' &&
			meta.options &&
			'multiple' in meta.options
		) {
			return Boolean(meta.options.multiple)
		}

		return false
	}

	/**
	 * Build UI options from field metadata
	 */
	private buildUIFromFieldMetadata(
		meta: FieldMetadata,
	): UIFieldMetadata['options'] | undefined {
		const { options, type, designType } = meta

		// Build UI type mapping
		const uiTypeMap: Record<string, string> = {
			text: 'text',
			number: 'number',
			boolean:
				options && 'style' in options && options.style === 'checkbox'
					? 'checkbox'
					: 'switch',
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

		const uiOptions: Record<string, unknown> = {
			type: uiTypeMap[type] ?? 'text',
			designType: designType as Function,
		}

		// Copy relevant options
		if (options.label) uiOptions.label = options.label
		if (options.description) uiOptions.description = options.description
		if (options.tab) uiOptions.tab = options.tab
		if (options.side) uiOptions.side = options.side
		if (options.hidden) uiOptions.hidden = options.hidden
		if (options.readonly) uiOptions.readonly = options.readonly

		// Handle select/enum options
		if ((type === 'select' || type === 'enum') && 'options' in options) {
			uiOptions.options = this.convertSelectOptions(
				options as Record<string, unknown>,
			)
		}

		return uiOptions as UIFieldMetadata['options']
	}

	/**
	 * Convert select/enum options to UI format
	 */
	private convertSelectOptions(
		options: Record<string, unknown>,
	): Array<{ key: string; value: string }> {
		if ('enum' in options && options.enum) {
			// Handle enum type
			const enumObj = options.enum as Record<string, string | number>
			return Object.entries(enumObj)
				.filter(([key]) => Number.isNaN(Number(key)))
				.map(([key, value]) => ({ key: String(value), value: key }))
		}

		if ('options' in options && Array.isArray(options.options)) {
			return options.options.map((opt: unknown) => {
				if (
					typeof opt === 'object' &&
					opt !== null &&
					'label' in opt &&
					'value' in opt
				) {
					const typedOpt = opt as { label: string; value: string | number }
					return { key: String(typedOpt.value), value: typedOpt.label }
				}
				return { key: String(opt), value: String(opt) }
			})
		}

		return []
	}

	/**
	 * Get ref (relationship reference) from field metadata
	 */
	private getRefFromFieldMetadata(meta: FieldMetadata): string | undefined {
		if (meta.type === 'relationship' && meta.options && 'ref' in meta.options) {
			return meta.options.ref as string
		}
		return undefined
	}

	getParamDetails(controller: Function, methodName: string) {
		const routeArgsMetadata: Record<string, any> =
			Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, methodName) || {}

		const paramTypes: Type<any>[] =
			Reflect.getMetadata(
				PARAMTYPES_METADATA,
				controller.prototype,
				methodName,
			) || []

		const paramDetails: Array<{ arg: string; type: string; name: string }> = []

		for (const [index, [key, metadata]] of Object.entries(
			routeArgsMetadata,
		).entries()) {
			const keyIndex = Number.parseInt(key, 10)
			const location = RouteParamtypes[keyIndex] || 'unknown'
			const type = paramTypes[index]?.name || 'unknown'

			paramDetails.push({
				arg: location,
				type: type,
				name: metadata.data || `param${index}`,
			})
		}

		return paramDetails
	}

	private getValidationMetadata(
		entity: Function,
		propertyKey: string,
	): Array<{ type: string; name: string; constraints?: any[] }> {
		const uniqueValidations = []
		const metadataStorage = getMetadataStorage()
		const validationMetadatas = metadataStorage.getTargetValidationMetadatas(
			entity,
			propertyKey,
			false,
			false,
		)

		for (const metadata of validationMetadatas) {
			if (propertyKey === metadata.propertyName) {
				uniqueValidations.push({
					type: metadata.type,
					name: metadata.name || metadata.constraintCls?.name,
					...(metadata.constraints && { constraints: metadata.constraints }),
				})
			}
		}

		return uniqueValidations
	}
}
