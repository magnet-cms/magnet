import {
	ControllerMetadata,
	MethodMetadata,
	SchemaMetadata,
} from '@magnet/common'
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

	getDiscoveredControllers(): ControllerMetadata[] {
		return this.controllers
	}

	getDiscoveredSchemas(): SchemaMetadata[] {
		return this.schemas.filter(
			(schema) => !EXCLUDED_SCHEMAS.includes(schema.name.toLowerCase()),
		)
	}

	getDiscoveredSettingsSchemas(): SchemaMetadata[] {
		return this.settingsSchemas
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
