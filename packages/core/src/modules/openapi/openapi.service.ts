import {
	Inject,
	Injectable,
	Logger,
	OnApplicationBootstrap,
	Optional,
} from '@nestjs/common'
import { DiscoveryService } from '~/modules/discovery/discovery.service'
import { buildOpenAPIDocument } from './openapi.builder'
import { enrichDocumentWithSchemas } from './openapi.schema-gen'
import { OPENAPI_CONFIG } from './openapi.types'
import type { OASDocument, OpenAPIConfig } from './openapi.types'

@Injectable()
export class OpenAPIService implements OnApplicationBootstrap {
	private readonly logger = new Logger(OpenAPIService.name)
	private document: OASDocument | null = null

	constructor(
		@Inject(OPENAPI_CONFIG) private readonly config: OpenAPIConfig,
		@Optional() private readonly discoveryService?: DiscoveryService,
	) {}

	onApplicationBootstrap(): void {
		this.document = buildOpenAPIDocument(this.config)

		if (this.discoveryService) {
			const schemas = this.discoveryService.getAllDiscoveredSchemas()
			enrichDocumentWithSchemas(this.document, schemas)
		}

		this.logger.log(
			'OpenAPI document ready (served at /oas.json and configured Swagger UI path)',
		)
	}

	/** Returns the built OASDocument (available after bootstrap) */
	getDocument(): OASDocument | null {
		return this.document
	}

	/** Enriches the document with additional path items (used by Task 2) */
	enrichDocument(updater: (doc: OASDocument) => void): void {
		if (this.document) {
			updater(this.document)
		}
	}
}
