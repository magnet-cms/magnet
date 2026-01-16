import { ControllerMetadata, MethodMetadata } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { PATH_METADATA } from '@nestjs/common/constants'
import { ModulesContainer } from '@nestjs/core'
import { MetadataExtractorService } from './metadata-extractor.service'

@Injectable()
export class MethodDiscoveryService {
	constructor(
		private readonly modulesContainer: ModulesContainer,
		private readonly metadataExtractor: MetadataExtractorService,
	) {}

	getMethodDetails(
		path: string,
		methodName: string,
		controllers: ControllerMetadata[],
	): MethodMetadata | { error: string } {
		const controller = controllers.find((c) => c.basePath === path)
		if (!controller)
			return { error: `Controller with path '${path}' not found` }

		const method = controller.methods.find(
			(m) => m.name.toLowerCase() === methodName.toLowerCase(),
		)
		if (!method)
			return {
				error: `Method '${methodName}' not found in controller '${path}'`,
			}

		const controllerInstance = [...this.modulesContainer.values()]
			.flatMap((module) => [...module.controllers.values()])
			.find(
				(wrapper) =>
					wrapper.metatype &&
					Reflect.getMetadata(PATH_METADATA, wrapper.metatype) === path,
			)

		if (!controllerInstance)
			return { error: `Controller instance not found for '${path}'` }

		if (!controllerInstance.metatype)
			return { error: `Metatype not found for '${path}'` }

		const prototype = controllerInstance.metatype.prototype

		const methodMetadata = this.metadataExtractor.extractMethodMetadata(
			prototype,
			methodName,
		)

		if (!methodMetadata) return { error: 'Failed to extract method metadata' }

		return methodMetadata
	}
}
