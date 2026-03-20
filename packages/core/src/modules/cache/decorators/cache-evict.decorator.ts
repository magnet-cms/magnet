import { CACHE_METADATA_KEY } from '../cache.constants'

export interface CacheEvictOptions {
	/**
	 * Cache key or glob pattern to evict (e.g., `posts:*` removes all post entries).
	 * If omitted, evicts the default key for this method.
	 */
	key?: string
	/**
	 * When true, uses `deleteByPattern(key)` instead of `delete(key)`.
	 * Useful with glob patterns to evict multiple related keys at once.
	 */
	allEntries?: boolean
}

/**
 * Evict cache entries after a controller method executes.
 *
 * The method always executes. After it completes, the specified cache key(s)
 * are removed to prevent stale data on the next read.
 *
 * **⚠️ Requires `@UseInterceptors(CacheInterceptor)` on the controller or method.**
 *
 * @example
 * ```typescript
 * @Patch(':id')
 * @CacheEvict({ key: 'posts:*', allEntries: true })
 * @UseInterceptors(CacheInterceptor)
 * async updatePost(@Param('id') id: string, @Body() dto: UpdatePostDto) {
 *   return this.postsService.update(id, dto)
 * }
 * ```
 */
export function CacheEvict(options: CacheEvictOptions = {}): MethodDecorator {
	return function cacheEvictDecorator(
		targetOrMethod: object,
		_propertyKeyOrContext?: string | symbol | ClassMethodDecoratorContext,
		descriptor?: PropertyDescriptor,
	): PropertyDescriptor | undefined {
		const metadata = { operation: 'evict', ...options }

		// Legacy decorator form (3 args): target, propertyKey, descriptor
		if (descriptor !== undefined) {
			Reflect.defineMetadata(CACHE_METADATA_KEY, metadata, descriptor.value)
			return descriptor
		}

		// Stage 3 TC39 decorator form (2 args): (fn, context)
		Reflect.defineMetadata(CACHE_METADATA_KEY, metadata, targetOrMethod)
	} as MethodDecorator
}
