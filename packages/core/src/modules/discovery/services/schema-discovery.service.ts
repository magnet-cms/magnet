import {
	SCHEMA_METADATA_KEY,
	SETTING_METADATA_KEY,
	SchemaMetadata,
} from '@magnet/common'
import { Injectable } from '@nestjs/common'
import { ModulesContainer } from '@nestjs/core'
import { MetadataExtractorService } from './metadata-extractor.service'

@Injectable()
export class SchemaDiscoveryService {
	constructor(
		private readonly modulesContainer: ModulesContainer,
		private readonly metadataExtractor: MetadataExtractorService,
	) {}

	discoverSchemas(): { schemas: SchemaMetadata[]; settings: SchemaMetadata[] } {
		const allSchemas = [...this.modulesContainer.values()]
			.flatMap((module) => [...module.providers.values()])
			.filter(
				(wrapper) => wrapper.metatype && typeof wrapper.metatype === 'function',
			)

		const schemas = allSchemas
			.filter(
				(wrapper) =>
					wrapper.metatype &&
					Reflect.getMetadata(SCHEMA_METADATA_KEY, wrapper.metatype) !==
						undefined,
			)
			.map((wrapper) => this.metadataExtractor.extractSchemaMetadata(wrapper))
			.filter((schema) => schema !== null) as SchemaMetadata[]

		const settingsSchemas = allSchemas
			.filter(
				(wrapper) =>
					wrapper.metatype &&
					Reflect.getMetadata(SETTING_METADATA_KEY, wrapper.metatype) !==
						undefined,
			)
			.map((wrapper) => this.metadataExtractor.extractSchemaMetadata(wrapper))
			.filter((schema) => schema !== null) as SchemaMetadata[]

		return { schemas, settings: settingsSchemas }
	}
}
