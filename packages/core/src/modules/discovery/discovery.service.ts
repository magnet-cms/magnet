import {
	ControllerMetadata,
	MethodMetadata,
	SchemaMetadata,
} from '@magnet-cms/common'
import { Injectable, OnModuleInit } from '@nestjs/common'
import { ControllerDiscoveryService } from './services/controller-discovery.service'
import { MethodDiscoveryService } from './services/method-discovery.service'
import { SchemaDiscoveryService } from './services/schema-discovery.service'

const EXCLUDED_SCHEMAS = ['setting', 'history']

@Injectable()
export class DiscoveryService implements OnModuleInit {
	private controllers: ControllerMetadata[] = []
	private schemas: SchemaMetadata[] = []
	private settingsSchemas: SchemaMetadata[] = []

	constructor(
		private readonly controllerDiscovery: ControllerDiscoveryService,
		private readonly schemaDiscovery: SchemaDiscoveryService,
		private readonly methodDiscovery: MethodDiscoveryService,
	) {}

	onModuleInit() {
		const { schemas, settings } = this.schemaDiscovery.discoverSchemas()
		this.controllers = this.controllerDiscovery.discoverControllers()
		this.schemas = schemas
		this.settingsSchemas = settings
	}

	getDiscoveredSchemas(): string[] {
		return this.schemas
			.filter((schema) => !EXCLUDED_SCHEMAS.includes(schema.name.toLowerCase()))
			.filter((schema) => schema.options?.visible !== false) // Filter out hidden schemas
			.map((schema) => schema.apiName || schema.name) // Use apiName (kebab-case) for routes, fallback to name
	}

	getAllDiscoveredSchemas(): SchemaMetadata[] {
		return this.schemas
			.filter((schema) => !EXCLUDED_SCHEMAS.includes(schema.name.toLowerCase()))
			.filter((schema) => schema.options?.visible !== false) // Filter out hidden schemas
	}

	getDiscoveredSchema(name: string): SchemaMetadata | { error: string } {
		// Normalize input: convert snake_case or any separators to kebab-case
		const normalizedName = name
			.replace(/_/g, '-')
			.replace(/([a-z])([A-Z])/g, '$1-$2')
			.toLowerCase()

		// Try to find by apiName (kebab-case) first, then by name (case-insensitive)
		const found =
			this.schemas.find(
				(schema) =>
					schema.apiName?.toLowerCase() === normalizedName ||
					schema.name.toLowerCase() === normalizedName ||
					schema.name.toLowerCase() === name.toLowerCase(),
			) ||
			this.schemas.find(
				(schema) => schema.className?.toLowerCase() === name.toLowerCase(),
			)

		return found || { error: 'Schema not found' }
	}

	getDiscoveredSettingsSchemas(): string[] {
		// Return apiName (group name from @Settings) for routing, fallback to lowercase name
		return this.settingsSchemas.map(
			(schema) => schema.apiName || schema.name.toLowerCase(),
		)
	}

	getAllDiscoveredSettingsSchemas(): SchemaMetadata[] {
		return this.settingsSchemas
	}

	getDiscoveredSettingsSchemaNames(): string[] {
		// Return apiName (group name from @Settings) for routing, fallback to lowercase name
		return this.settingsSchemas.map(
			(schema) => schema.apiName || schema.name.toLowerCase(),
		)
	}

	getDiscoveredSettingsSchema(
		name: string,
	): SchemaMetadata | { error: string } {
		// Case-insensitive lookup by apiName (group), name, or className
		const lowerName = name.toLowerCase()
		return (
			this.settingsSchemas.find(
				(schema) =>
					schema.apiName?.toLowerCase() === lowerName ||
					schema.name.toLowerCase() === lowerName ||
					schema.className?.toLowerCase() === lowerName,
			) || {
				error: 'Schema not found',
			}
		)
	}

	getDiscoveredControllers(): string[] {
		return this.controllers.map((controller) => controller.name)
	}

	getDiscoveredController(
		name: string,
	): ControllerMetadata | { error: string } {
		return (
			this.controllers.find((controller) => controller.name === name) || {
				error: 'Controller not found',
			}
		)
	}

	getMethodDetails(
		path: string,
		methodName: string,
	): MethodMetadata | { error: string } {
		return this.methodDiscovery.getMethodDetails(
			path,
			methodName,
			this.controllers,
		)
	}
}
