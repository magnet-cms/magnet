import { describe, expect, it } from 'vitest'
import { OpenAPIModule } from '../openapi.module'
import { OpenAPIService } from '../openapi.service'
import { OPENAPI_CONFIG } from '../openapi.types'

describe('OpenAPIModule.forRoot', () => {
	it('should return a DynamicModule with the correct module class', () => {
		const mod = OpenAPIModule.forRoot({})
		expect(mod.module).toBe(OpenAPIModule)
	})

	it('should provide OPENAPI_CONFIG with given config value', () => {
		const config = { title: 'Test API', version: '2.0.0' }
		const mod = OpenAPIModule.forRoot(config)
		const configProvider = (mod.providers ?? []).find(
			(p) =>
				typeof p === 'object' && 'provide' in p && p.provide === OPENAPI_CONFIG,
		)
		expect(configProvider).toBeDefined()
		expect((configProvider as { useValue: unknown }).useValue).toEqual(config)
	})

	it('should provide OpenAPIService', () => {
		const mod = OpenAPIModule.forRoot({})
		expect(mod.providers).toContain(OpenAPIService)
	})

	it('should export OpenAPIService', () => {
		const mod = OpenAPIModule.forRoot({})
		expect(mod.exports).toContain(OpenAPIService)
	})

	it('should use empty config when called with no arguments', () => {
		const mod = OpenAPIModule.forRoot()
		const configProvider = (mod.providers ?? []).find(
			(p) =>
				typeof p === 'object' && 'provide' in p && p.provide === OPENAPI_CONFIG,
		)
		expect((configProvider as { useValue: unknown }).useValue).toEqual({})
	})
})
