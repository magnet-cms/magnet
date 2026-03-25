import { describe, expect, it, vi } from 'vitest'
import { OpenAPIService } from '../openapi.service'
import type { OpenAPIConfig } from '../openapi.types'

function makeService(config: OpenAPIConfig = {}) {
	const service = new OpenAPIService(config)
	return { service }
}

describe('OpenAPIService', () => {
	describe('onApplicationBootstrap', () => {
		it('should build document without http adapter', () => {
			const { service } = makeService()
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

	describe('document content', () => {
		it('should include configured title in built document', () => {
			const { service } = makeService({ title: 'Test API' })
			service.onApplicationBootstrap()
			expect(service.getDocument()?.info.title).toBe('Test API')
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
