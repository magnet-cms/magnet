import {
	Inject,
	Injectable,
	Logger,
	OnApplicationBootstrap,
	Optional,
} from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import type { Request, Response } from 'express'
import { DiscoveryService } from '~/modules/discovery/discovery.service'
import { buildOpenAPIDocument, buildSwaggerUiHtml } from './openapi.builder'
import { enrichDocumentWithSchemas } from './openapi.schema-gen'
import { OPENAPI_CONFIG } from './openapi.types'
import type { OASDocument, OpenAPIConfig } from './openapi.types'

@Injectable()
export class OpenAPIService implements OnApplicationBootstrap {
	private readonly logger = new Logger(OpenAPIService.name)
	private document: OASDocument | null = null

	constructor(
		private readonly httpAdapterHost: HttpAdapterHost,
		@Inject(OPENAPI_CONFIG) private readonly config: OpenAPIConfig,
		@Optional() private readonly discoveryService?: DiscoveryService,
	) {}

	onApplicationBootstrap(): void {
		const adapter = this.httpAdapterHost?.httpAdapter
		if (!adapter) {
			this.logger.warn(
				'HttpAdapter not available — skipping OpenAPI route registration',
			)
			return
		}

		this.document = buildOpenAPIDocument(this.config)

		// Enrich with dynamically discovered content schemas
		if (this.discoveryService) {
			const schemas = this.discoveryService.getAllDiscoveredSchemas()
			enrichDocumentWithSchemas(this.document, schemas)
		}

		const uiPath = this.config.path ?? '/api-docs'
		const specPath = '/oas.json'

		// GET /oas.json — always at fixed path
		adapter.get(specPath, (_req: Request, res: Response) => {
			res.type('application/json').send(JSON.stringify(this.document, null, 2))
		})

		// GET /api-docs (or configured path) — Swagger UI
		adapter.get(uiPath, (_req: Request, res: Response) => {
			const title = this.config.title ?? 'Magnet CMS API'
			res.type('text/html').send(buildSwaggerUiHtml(title, specPath))
		})

		this.logger.log(`OpenAPI spec available at ${specPath}`)
		this.logger.log(`Swagger UI available at ${uiPath}`)
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
