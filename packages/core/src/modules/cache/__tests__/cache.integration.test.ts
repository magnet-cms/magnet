import { describe, expect, it } from 'vitest'
import 'reflect-metadata'
import { MemoryCacheAdapter } from '../adapters/memory-cache.adapter'
import { CACHE_ADAPTER_TOKEN } from '../cache.constants'
import { CACHE_METADATA_KEY, CACHE_TTL_KEY } from '../cache.constants'
import { CacheService } from '../cache.service'
import { CacheEvict, CachePut, CacheTTL, Cacheable } from '../decorators'

/**
 * Integration smoke tests for the cache system.
 * Tests observable behaviors through the public API without a full NestJS context.
 */
describe('Cache system integration', () => {
	describe('MemoryCacheAdapter — end-to-end operations', () => {
		it('should perform a full get/set/has/delete cycle', async () => {
			const adapter = new MemoryCacheAdapter()

			expect(await adapter.has('k')).toBe(false)
			await adapter.set('k', { data: 1 }, 60)
			expect(await adapter.has('k')).toBe(true)
			expect(await adapter.get<{ data: number }>('k')).toEqual({ data: 1 })
			await adapter.delete('k')
			expect(await adapter.has('k')).toBe(false)
			expect(await adapter.get('k')).toBeNull()

			await adapter.dispose?.()
		})

		it('should evict via pattern matching', async () => {
			const adapter = new MemoryCacheAdapter()

			await adapter.set('posts:1', 'a')
			await adapter.set('posts:2', 'b')
			await adapter.set('users:1', 'c')

			await adapter.deleteByPattern('posts:*')

			expect(await adapter.get('posts:1')).toBeNull()
			expect(await adapter.get('posts:2')).toBeNull()
			expect(await adapter.get('users:1')).toBe('c')

			await adapter.dispose?.()
		})

		it('should report healthy', async () => {
			const adapter = new MemoryCacheAdapter()
			const health = await adapter.healthCheck()
			expect(health.healthy).toBe(true)
			await adapter.dispose?.()
		})

		it('should expire entries after TTL', async () => {
			const adapter = new MemoryCacheAdapter({ cleanupIntervalMs: 0 })
			await adapter.set('ttl-key', 'value', 0.001) // 1ms TTL

			await new Promise((resolve) => setTimeout(resolve, 10))

			expect(await adapter.get('ttl-key')).toBeNull()
			await adapter.dispose?.()
		})
	})

	describe('CacheService with MemoryCacheAdapter', () => {
		it('should delegate all operations to the adapter', async () => {
			const adapter = new MemoryCacheAdapter()
			const service = new CacheService(adapter)

			await service.set('svc:key', 'hello', 60)
			expect(await service.get<string>('svc:key')).toBe('hello')
			expect(await service.has('svc:key')).toBe(true)
			await service.delete('svc:key')
			expect(await service.get('svc:key')).toBeNull()

			await adapter.dispose?.()
		})

		it('should expose adapterName matching the adapter', () => {
			const adapter = new MemoryCacheAdapter()
			const service = new CacheService(adapter)
			expect(service.adapterName).toBe('memory')
			expect(service.adapterName).toBe(adapter.name)
		})

		it('should report health via the adapter', async () => {
			const adapter = new MemoryCacheAdapter()
			const service = new CacheService(adapter)
			const health = await service.healthCheck()
			expect(health.healthy).toBe(true)
			await adapter.dispose?.()
		})
	})

	describe('Cache constants', () => {
		it('should export CACHE_ADAPTER_TOKEN', () => {
			expect(CACHE_ADAPTER_TOKEN).toBe('CACHE_ADAPTER')
		})

		it('should export CACHE_METADATA_KEY', () => {
			expect(typeof CACHE_METADATA_KEY).toBe('string')
		})

		it('should export CACHE_TTL_KEY', () => {
			expect(typeof CACHE_TTL_KEY).toBe('string')
		})
	})

	describe('Decorator metadata integration', () => {
		it('should compose @Cacheable and @CacheTTL on the same method', () => {
			class Controller {
				@Cacheable({ key: 'posts:list' })
				@CacheTTL(30)
				method() {}
			}

			const fn = Controller.prototype.method
			const meta = Reflect.getMetadata(CACHE_METADATA_KEY, fn)
			const ttl = Reflect.getMetadata(CACHE_TTL_KEY, fn)

			expect(meta).toEqual({ operation: 'cacheable', key: 'posts:list' })
			expect(ttl).toBe(30)
		})

		it('should support @CacheEvict with allEntries for glob patterns', () => {
			class Controller {
				@CacheEvict({ key: 'posts:*', allEntries: true })
				mutate() {}
			}

			const meta = Reflect.getMetadata(
				CACHE_METADATA_KEY,
				Controller.prototype.mutate,
			)
			expect(meta).toEqual({
				operation: 'evict',
				key: 'posts:*',
				allEntries: true,
			})
		})

		it('should support @CachePut for forced refresh', () => {
			class Controller {
				@CachePut({ key: 'posts:1', ttl: 120 })
				refresh() {}
			}

			const meta = Reflect.getMetadata(
				CACHE_METADATA_KEY,
				Controller.prototype.refresh,
			)
			expect(meta).toEqual({ operation: 'put', key: 'posts:1', ttl: 120 })
		})
	})

	describe('Custom adapter acceptance', () => {
		it('should accept any CacheAdapter subclass via CacheService', async () => {
			class MockAdapter extends MemoryCacheAdapter {
				override readonly name = 'mock'
			}

			const adapter = new MockAdapter()
			const service = new CacheService(adapter)

			await service.set('x', 1)
			expect(await service.get('x')).toBe(1)
			expect(service.adapterName).toBe('mock')

			await adapter.dispose?.()
		})
	})
})
