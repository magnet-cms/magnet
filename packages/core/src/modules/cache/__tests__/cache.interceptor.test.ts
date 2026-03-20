import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { CacheAdapter, CacheHealthResult } from '@magnet-cms/common'
import type { CallHandler, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { firstValueFrom, of } from 'rxjs'
import { CACHE_METADATA_KEY, CACHE_TTL_KEY } from '../cache.constants'
import { CacheService } from '../cache.service'
import { CacheInterceptor } from '../interceptors/cache.interceptor'

const mockGet = mock(async (_key: string) => null as unknown)
const mockSet = mock(async () => {})
const mockDelete = mock(async () => {})
const mockDeleteByPattern = mock(async () => {})
const mockHas = mock(async () => false)
const mockClear = mock(async () => {})
const mockHealthCheck = mock(
	async (): Promise<CacheHealthResult> => ({ healthy: true }),
)

const mockAdapter: CacheAdapter = {
	name: 'mock',
	get: mockGet,
	set: mockSet,
	delete: mockDelete,
	deleteByPattern: mockDeleteByPattern,
	has: mockHas,
	clear: mockClear,
	healthCheck: mockHealthCheck,
}

function makeContext(
	metadata: Record<string, unknown> | null,
	ttl?: number,
): ExecutionContext {
	return {
		getHandler: () => {
			const fn = () => {}
			if (metadata) {
				Reflect.defineMetadata(CACHE_METADATA_KEY, metadata, fn)
			}
			if (ttl !== undefined) {
				Reflect.defineMetadata(CACHE_TTL_KEY, ttl, fn)
			}
			return fn
		},
		getClass: () => class {},
	} as unknown as ExecutionContext
}

function makeCallHandler(returnValue: unknown): CallHandler {
	return { handle: () => of(returnValue) }
}

describe('CacheInterceptor', () => {
	let interceptor: CacheInterceptor
	let service: CacheService
	let reflector: Reflector

	beforeEach(() => {
		mockGet.mockClear()
		mockSet.mockClear()
		mockDelete.mockClear()
		mockDeleteByPattern.mockClear()
		service = new CacheService(mockAdapter)
		reflector = new Reflector()
		interceptor = new CacheInterceptor(service, reflector)
	})

	describe('no cache metadata', () => {
		it('should pass through when no metadata', async () => {
			const ctx = makeContext(null)
			const handler = makeCallHandler('result')
			const result$ = interceptor.intercept(ctx, handler)
			const result = await firstValueFrom(result$)
			expect(result).toBe('result')
			expect(mockGet).not.toHaveBeenCalled()
			expect(mockSet).not.toHaveBeenCalled()
		})
	})

	describe('@Cacheable', () => {
		it('should return cached value on hit', async () => {
			mockGet.mockResolvedValueOnce('cached-data')
			const ctx = makeContext({ operation: 'cacheable', key: 'test-key' })
			const handler = makeCallHandler('fresh-data')
			const result$ = interceptor.intercept(ctx, handler)
			const result = await firstValueFrom(result$)
			expect(result).toBe('cached-data')
			expect(mockGet).toHaveBeenCalledWith('test-key')
			expect(mockSet).not.toHaveBeenCalled()
		})

		it('should execute method and cache on miss', async () => {
			mockGet.mockResolvedValueOnce(null)
			const ctx = makeContext({ operation: 'cacheable', key: 'test-key' })
			const handler = makeCallHandler('fresh-data')
			const result$ = interceptor.intercept(ctx, handler)
			const result = await firstValueFrom(result$)
			expect(result).toBe('fresh-data')
			expect(mockSet).toHaveBeenCalledWith('test-key', 'fresh-data', 300)
		})

		it('should use @CacheTTL override', async () => {
			mockGet.mockResolvedValueOnce(null)
			const ctx = makeContext({ operation: 'cacheable', key: 'ttl-key' }, 90)
			const handler = makeCallHandler('data')
			await firstValueFrom(interceptor.intercept(ctx, handler))
			expect(mockSet).toHaveBeenCalledWith('ttl-key', 'data', 90)
		})
	})

	describe('@CacheEvict', () => {
		it('should delete by key after method executes', async () => {
			const ctx = makeContext({ operation: 'evict', key: 'posts:1' })
			const handler = makeCallHandler('done')
			const result$ = interceptor.intercept(ctx, handler)
			const result = await firstValueFrom(result$)
			expect(result).toBe('done')
			expect(mockDelete).toHaveBeenCalledWith('posts:1')
		})

		it('should deleteByPattern when allEntries is true', async () => {
			const ctx = makeContext({
				operation: 'evict',
				key: 'posts:*',
				allEntries: true,
			})
			const handler = makeCallHandler('done')
			await firstValueFrom(interceptor.intercept(ctx, handler))
			expect(mockDeleteByPattern).toHaveBeenCalledWith('posts:*')
		})
	})

	describe('@CachePut', () => {
		it('should always execute and cache result', async () => {
			const ctx = makeContext({ operation: 'put', key: 'force-key' })
			const handler = makeCallHandler('fresh')
			const result$ = interceptor.intercept(ctx, handler)
			const result = await firstValueFrom(result$)
			expect(result).toBe('fresh')
			expect(mockGet).not.toHaveBeenCalled()
			expect(mockSet).toHaveBeenCalledWith('force-key', 'fresh', 300)
		})
	})
})
