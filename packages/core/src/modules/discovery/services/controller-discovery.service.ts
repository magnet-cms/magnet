import { ControllerMetadata } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { ModulesContainer } from '@nestjs/core'
import { MetadataExtractorService } from './metadata-extractor.service'

@Injectable()
export class ControllerDiscoveryService {
	constructor(
		private readonly modulesContainer: ModulesContainer,
		private readonly metadataExtractor: MetadataExtractorService,
	) {}

	discoverControllers(): ControllerMetadata[] {
		return [...this.modulesContainer.values()]
			.flatMap((module) => Array.from(module.controllers.values()))
			.filter(
				(wrapper) => wrapper.metatype && typeof wrapper.metatype === 'function',
			)
			.map((wrapper) =>
				this.metadataExtractor.extractControllerMetadata(wrapper),
			)
	}
}
