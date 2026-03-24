import { describe, expect, it } from 'vitest'
import 'reflect-metadata'
import { CACHE_METADATA_KEY, CACHE_TTL_KEY } from '../cache.constants'
import { CacheEvict } from '../decorators/cache-evict.decorator'
import { CachePut } from '../decorators/cache-put.decorator'
import { CacheTTL } from '../decorators/cache-ttl.decorator'
import { Cacheable } from '../decorators/cacheable.decorator'

// Metadata is stored on descriptor.value (the function), accessed via prototype[methodName]

describe('Cache decorators', () => {
	describe('@Cacheable', () => {
		it('should set cacheable metadata with defaults', () => {
			class TestClass {
				@Cacheable()
				method() {}
			}
			const meta = Reflect.getMetadata(
				CACHE_METADATA_KEY,
				TestClass.prototype.method,
			)
			expect(meta).toEqual({ operation: 'cacheable' })
		})

		it('should set cacheable metadata with key and ttl', () => {
			class TestClass {
				@Cacheable({ key: 'my-key', ttl: 60 })
				method() {}
			}
			const meta = Reflect.getMetadata(
				CACHE_METADATA_KEY,
				TestClass.prototype.method,
			)
			expect(meta).toEqual({ operation: 'cacheable', key: 'my-key', ttl: 60 })
		})
	})

	describe('@CacheEvict', () => {
		it('should set evict metadata with defaults', () => {
			class TestClass {
				@CacheEvict()
				method() {}
			}
			const meta = Reflect.getMetadata(
				CACHE_METADATA_KEY,
				TestClass.prototype.method,
			)
			expect(meta).toEqual({ operation: 'evict' })
		})

		it('should set evict metadata with key and allEntries', () => {
			class TestClass {
				@CacheEvict({ key: 'posts:*', allEntries: true })
				method() {}
			}
			const meta = Reflect.getMetadata(
				CACHE_METADATA_KEY,
				TestClass.prototype.method,
			)
			expect(meta).toEqual({
				operation: 'evict',
				key: 'posts:*',
				allEntries: true,
			})
		})
	})

	describe('@CachePut', () => {
		it('should set put metadata with defaults', () => {
			class TestClass {
				@CachePut()
				method() {}
			}
			const meta = Reflect.getMetadata(
				CACHE_METADATA_KEY,
				TestClass.prototype.method,
			)
			expect(meta).toEqual({ operation: 'put' })
		})

		it('should set put metadata with key and ttl', () => {
			class TestClass {
				@CachePut({ key: 'users:list', ttl: 120 })
				method() {}
			}
			const meta = Reflect.getMetadata(
				CACHE_METADATA_KEY,
				TestClass.prototype.method,
			)
			expect(meta).toEqual({ operation: 'put', key: 'users:list', ttl: 120 })
		})
	})

	describe('@CacheTTL', () => {
		it('should set TTL metadata on the method function', () => {
			class TestClass {
				@CacheTTL(120)
				method() {}
			}
			const ttl = Reflect.getMetadata(CACHE_TTL_KEY, TestClass.prototype.method)
			expect(ttl).toBe(120)
		})
	})
})
