import { describe, expect, it, vi } from 'vitest'
import { OpenAPIService } from '../openapi.service'
import { OPENAPI_CONFIG } from '../openapi.types'
import type { OpenAPIConfig } from '../openapi.types'

function makeService(config: OpenAPIConfig = {}) {
	const routes: Record<string, (req: unknown, res: unknown) => void> = {}
	const httpAdapterHost = {
		httpAdapter: {
			get: vi.fn(
				(path: string, handler: (req: unknown, res: unknown) => void) => {
					routes[path] = handler
				},
			),
		},
	} as never

	const service = new OpenAPIService(httpAdapterHost, config)
	service[OPENAPI_CONFIG as never] = config
	return { service, httpAdapterHost, routes }
}

describe('OpenAPIService', () => {
	describe('onApplicationBootstrap', () => {
		it('should register GET /oas.json route', () => {
			const { service, httpAdapterHost } = makeService()
			service.onApplicationBootstrap()
			expect(httpAdapterHost.httpAdapter.get).toHaveBeenCalledWith(
				'/oas.json',
				expect.any(Function),
			)
		})

		it('should register GET /api-docs route by default', () => {
			const { service, httpAdapterHost } = makeService()
			service.onApplicationBootstrap()
			expect(httpAdapterHost.httpAdapter.get).toHaveBeenCalledWith(
				'/api-docs',
				expect.any(Function),
			)
		})

		it('should register configured UI path instead of /api-docs', () => {
			const { service, httpAdapterHost } = makeService({ path: '/docs' })
			service.onApplicationBootstrap()
			expect(httpAdapterHost.httpAdapter.get).toHaveBeenCalledWith(
				'/docs',
				expect.any(Function),
			)
		})

		it('should not throw when httpAdapter is not available', () => {
			const service = new OpenAPIService({ httpAdapter: null } as never, {})
			expect(() => service.onApplicationBootstrap()).not.toThrow()
		})
	})

	describe('getDocument', () => {
		it('should return null before bootstrap', () => {
			const { service } = makeService()
			expect(service.getDocument()).toBeNull()
		})

		it('should return OASDocument after bootstrap', () => {
			const { service } = makeService()
			service.onApplicationBootstrap()
			const doc = service.getDocument()
			expect(doc).not.toBeNull()
			expect(doc?.openapi).toBe('3.0.0')
		})
	})

	describe('/oas.json handler', () => {
		it('should respond with JSON content type and document', () => {
			const { service, routes } = makeService({ title: 'Test API' })
			service.onApplicationBootstrap()

			const res = { type: vi.fn().mockReturnThis(), send: vi.fn() }
			routes['/oas.json']({}, res)

			expect(res.type).toHaveBeenCalledWith('application/json')
			expect(res.send).toHaveBeenCalledWith(
				expect.stringContaining('"openapi": "3.0.0"'),
			)
		})
	})

	describe('/api-docs handler', () => {
		it('should respond with HTML content type', () => {
			const { service, routes } = makeService({ title: 'My API' })
			service.onApplicationBootstrap()

			const res = { type: vi.fn().mockReturnThis(), send: vi.fn() }
			routes['/api-docs']({}, res)

			expect(res.type).toHaveBeenCalledWith('text/html')
			const html: string = res.send.mock.calls[0][0]
			expect(html).toContain('My API')
		})
	})

	describe('enrichDocument', () => {
		it('should call updater with the document after bootstrap', () => {
			const { service } = makeService()
			service.onApplicationBootstrap()

			const updater = vi.fn()
			service.enrichDocument(updater)

			expect(updater).toHaveBeenCalledWith(service.getDocument())
		})

		it('should not call updater when document is null', () => {
			const { service } = makeService()
			const updater = vi.fn()
			service.enrichDocument(updater)
			expect(updater).not.toHaveBeenCalled()
		})
	})
})
