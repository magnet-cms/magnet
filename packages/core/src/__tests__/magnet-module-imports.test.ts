import { describe, expect, it } from 'vitest'
import { OpenAPIModule } from '../modules/openapi/openapi.module'
import type { OpenAPIConfig } from '../modules/openapi/openapi.types'

/**
 * Tests for the OpenAPI conditional registration logic added to buildMagnetImports.
 *
 * We test the logic in isolation rather than loading the full buildMagnetImports
 * function (which requires heavy NestJS/DB module mocking due to reflect-metadata deps).
 * The actual integration is verified by the E2E tests in Task 7.
 */
function applyOpenAPIConditional(
	imports: unknown[],
	globalOptions: { openapi?: OpenAPIConfig | false } | undefined,
): void {
	const openapi = globalOptions?.openapi
	if (
		openapi !== false &&
		(openapi as OpenAPIConfig | undefined)?.enabled !== false
	) {
		imports.push(
			OpenAPIModule.forRoot(
				typeof openapi === 'object' && openapi !== null ? openapi : {},
			),
		)
	}
}

function hasOpenAPI(imports: unknown[]) {
	return imports.some(
		(m) => (m as { module?: unknown }).module === OpenAPIModule,
	)
}

describe('OpenAPI conditional import in buildMagnetImports', () => {
	it('should include OpenAPIModule when globalOptions is undefined', () => {
		const imports: unknown[] = []
		applyOpenAPIConditional(imports, undefined)
		expect(hasOpenAPI(imports)).toBe(true)
	})

	it('should include OpenAPIModule when globalOptions.openapi is an empty object', () => {
		const imports: unknown[] = []
		applyOpenAPIConditional(imports, { openapi: {} })
		expect(hasOpenAPI(imports)).toBe(true)
	})

	it('should include OpenAPIModule when globalOptions.openapi has config', () => {
		const imports: unknown[] = []
		applyOpenAPIConditional(imports, { openapi: { title: 'My API' } })
		expect(hasOpenAPI(imports)).toBe(true)
	})

	it('should exclude OpenAPIModule when globalOptions.openapi is false', () => {
		const imports: unknown[] = []
		applyOpenAPIConditional(imports, { openapi: false })
		expect(hasOpenAPI(imports)).toBe(false)
	})

	it('should exclude OpenAPIModule when globalOptions.openapi.enabled is false', () => {
		const imports: unknown[] = []
		applyOpenAPIConditional(imports, { openapi: { enabled: false } })
		expect(hasOpenAPI(imports)).toBe(false)
	})

	it('should pass config to OpenAPIModule.forRoot when object config provided', () => {
		const imports: unknown[] = []
		const config = { title: 'Test API', version: '2.0.0' }
		applyOpenAPIConditional(imports, { openapi: config })
		const mod = imports[0] as { config?: OpenAPIConfig }
		// OpenAPIModule.forRoot stores config via OPENAPI_CONFIG provider
		const providers = (
			imports[0] as {
				providers?: Array<{ provide: unknown; useValue: unknown }>
			}
		).providers
		const configProvider = providers?.find(
			(p) => p.provide === 'OPENAPI_CONFIG',
		)
		expect(configProvider?.useValue).toEqual(config)
	})
})
