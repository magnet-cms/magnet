import {
	ControllerMetadata,
	DESIGN_TYPE,
	MethodMetadata,
	PROP_METADATA_KEY,
	RESOLVE_METADATA_KEY,
	SchemaMetadata,
	UIFieldMetadata,
	UI_METADATA_KEY,
	getSchemaOptions,
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

	extractSchemaMetadata(wrapper: InstanceWrapper<any>): SchemaMetadata | null {
		const { metatype } = wrapper
		if (!metatype || typeof metatype !== 'function') return null

		const schemaProps =
			Reflect.getMetadata(PROP_METADATA_KEY, metatype.prototype) ?? []
		const uiMetadata: UIFieldMetadata[] =
			Reflect.getMetadata(UI_METADATA_KEY, metatype.prototype) ?? []

		const properties = schemaProps.map(
			(prop: { propertyKey: string; options?: any }) => {
				const uiField = uiMetadata.find(
					(ui) => ui.propertyKey === prop.propertyKey,
				)

				const designTypeMetadata = Reflect.getMetadata(
					DESIGN_TYPE,
					metatype.prototype,
					prop.propertyKey,
				)

				// Only include UI if explicitly defined with @UI() decorator
				// Fields without @UI() are hidden from the admin interface
				return {
					name: prop.propertyKey,
					type: prop.options?.type?.name || designTypeMetadata,
					validations: this.getValidationMetadata(metatype, prop.propertyKey),
					ui: uiField?.options,
					...prop.options,
				}
			},
		)

		return {
			name: metatype.name.toLowerCase() ?? 'unknownschema',
			properties,
			options: getSchemaOptions(metatype),
		}
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
