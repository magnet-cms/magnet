import { Controller, Get, Res, ServiceUnavailableException } from '@nestjs/common'
import type { Response } from 'express'

import { buildSwaggerUiHtml } from './openapi.builder'
import { OpenAPIService } from './openapi.service'
import type { OpenAPIConfig } from './openapi.types'

const SPEC_PATH = '/oas.json'

function normalizeSwaggerUiRoute(path: string): string {
  const trimmed = path.replace(/^\/+|\/+$/g, '')
  return trimmed.length > 0 ? trimmed : 'api-docs'
}

/**
 * Registers Nest HTTP routes for the OpenAPI JSON spec and Swagger UI.
 * Raw Express `adapter.get()` is not reliable after Nest/GraphQL wiring on Express 5,
 * so these endpoints are exposed as a controller.
 */
export function createOpenAPIController(config: OpenAPIConfig) {
  const uiRoute = normalizeSwaggerUiRoute(config.path ?? '/api-docs')
  const swaggerTitle = config.title ?? 'Magnet CMS API'

  @Controller()
  class OpenAPIHttpController {
    constructor(readonly openAPIService: OpenAPIService) {}

    @Get('oas.json')
    getSpec(@Res() res: Response): void {
      const doc = this.openAPIService.getDocument()
      if (!doc) {
        throw new ServiceUnavailableException('OpenAPI document is not ready yet')
      }
      res.type('application/json').send(JSON.stringify(doc, null, 2))
    }

    @Get(uiRoute)
    getSwaggerUi(@Res() res: Response): void {
      const doc = this.openAPIService.getDocument()
      if (!doc) {
        throw new ServiceUnavailableException('OpenAPI document is not ready yet')
      }
      res.type('text/html').send(buildSwaggerUiHtml(swaggerTitle, SPEC_PATH))
    }
  }

  Object.defineProperty(OpenAPIHttpController, 'name', {
    value: `OpenAPIHttpController_${uiRoute.replace(/[^a-zA-Z0-9]/g, '_')}`,
  })

  return OpenAPIHttpController
}
