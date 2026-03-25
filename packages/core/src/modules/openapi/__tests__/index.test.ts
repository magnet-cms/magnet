import { describe, expect, it } from 'vitest'

import {
  OPENAPI_CONFIG,
  OpenAPIModule,
  OpenAPIService,
  buildOpenAPIDocument,
  buildSwaggerUiHtml,
} from '../index'

describe('openapi barrel exports', () => {
  it('should export OpenAPIModule', () => {
    expect(OpenAPIModule).toBeDefined()
  })

  it('should export OpenAPIService', () => {
    expect(OpenAPIService).toBeDefined()
  })

  it('should export buildOpenAPIDocument', () => {
    expect(buildOpenAPIDocument).toBeDefined()
    expect(typeof buildOpenAPIDocument).toBe('function')
  })

  it('should export buildSwaggerUiHtml', () => {
    expect(buildSwaggerUiHtml).toBeDefined()
    expect(typeof buildSwaggerUiHtml).toBe('function')
  })

  it('should export OPENAPI_CONFIG token', () => {
    expect(OPENAPI_CONFIG).toBe('OPENAPI_CONFIG')
  })
})
