import { describe, expect, it } from 'vitest'

import { buildOpenAPIDocument, buildSwaggerUiHtml } from '../openapi.builder'
import type { OpenAPIConfig } from '../openapi.types'

describe('buildOpenAPIDocument', () => {
  it('should return OpenAPI 3.0.0 document', () => {
    const doc = buildOpenAPIDocument({})
    expect(doc.openapi).toBe('3.0.0')
  })

  it('should use configured title', () => {
    const config: OpenAPIConfig = { title: 'My Custom API' }
    const doc = buildOpenAPIDocument(config)
    expect(doc.info.title).toBe('My Custom API')
  })

  it('should use default title when not configured', () => {
    const doc = buildOpenAPIDocument({})
    expect(doc.info.title).toBe('Magnet CMS API')
  })

  it('should use configured version', () => {
    const config: OpenAPIConfig = { version: '2.5.0' }
    const doc = buildOpenAPIDocument(config)
    expect(doc.info.version).toBe('2.5.0')
  })

  it('should use default version when not configured', () => {
    const doc = buildOpenAPIDocument({})
    expect(doc.info.version).toBe('1.0.0')
  })

  it('should include Bearer auth security scheme', () => {
    const doc = buildOpenAPIDocument({})
    expect(doc.components?.securitySchemes?.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
  })

  it('should include API key security scheme', () => {
    const doc = buildOpenAPIDocument({})
    expect(doc.components?.securitySchemes?.apiKey).toMatchObject({
      type: 'apiKey',
      in: 'header',
      name: 'x-api-key',
    })
  })

  it('should include auth paths', () => {
    const doc = buildOpenAPIDocument({})
    expect(doc.paths).toHaveProperty('/auth/login')
    expect(doc.paths?.['/auth/login']).toHaveProperty('post')
    expect(doc.paths).toHaveProperty('/auth/register')
    expect(doc.paths).toHaveProperty('/auth/me')
  })

  it('should include health path', () => {
    const doc = buildOpenAPIDocument({})
    expect(doc.paths).toHaveProperty('/health')
    expect(doc.paths?.['/health']).toHaveProperty('get')
  })

  it('should include content paths with schema parameter', () => {
    const doc = buildOpenAPIDocument({})
    expect(doc.paths).toHaveProperty('/content/{schema}')
    expect(doc.paths?.['/content/{schema}']).toHaveProperty('get')
    expect(doc.paths?.['/content/{schema}']).toHaveProperty('post')
  })

  it('should include content document path', () => {
    const doc = buildOpenAPIDocument({})
    expect(doc.paths).toHaveProperty('/content/{schema}/{documentId}')
    expect(doc.paths?.['/content/{schema}/{documentId}']).toHaveProperty('get')
    expect(doc.paths?.['/content/{schema}/{documentId}']).toHaveProperty('put')
    expect(doc.paths?.['/content/{schema}/{documentId}']).toHaveProperty('delete')
  })

  it('should include storage paths', () => {
    const doc = buildOpenAPIDocument({})
    expect(doc.paths).toHaveProperty('/storage/media')
  })

  it('should include api-keys paths', () => {
    const doc = buildOpenAPIDocument({})
    expect(doc.paths).toHaveProperty('/api-keys')
  })
})

describe('buildSwaggerUiHtml', () => {
  it('should return HTML with the spec URL', () => {
    const html = buildSwaggerUiHtml('Test API', '/oas.json')
    expect(html).toContain('/oas.json')
    expect(html).toContain('swagger-ui')
  })

  it('should HTML-escape title to prevent XSS', () => {
    const html = buildSwaggerUiHtml('</title><script>alert(1)</script>', '/oas.json')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;/title&gt;')
  })

  it('should JSON.stringify specUrl to prevent JS string injection', () => {
    const malicious = '"; alert(1); var x="'
    const html = buildSwaggerUiHtml('Test', malicious)
    // JSON.stringify escapes double-quotes so the string cannot break out of the JS literal
    expect(html).toContain('\\"')
    expect(html).not.toContain(`url: "${malicious}"`)
  })
})
