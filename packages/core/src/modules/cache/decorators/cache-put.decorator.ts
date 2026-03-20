import { CACHE_METADATA_KEY } from '../cache.constants'

export interface CachePutOptions {
	/** Cache key. If omitted, a default key is generated from class name, method name, and args. */
	key?: string
	/** TTL override in seconds. If omitted, the interceptor uses @CacheTTL or adapter default. */
	ttl?: number
}

/**
 * Always execute the method and update the cache with the result.
 *
 * Unlike `@Cacheable`, this never returns a cached value — it always executes
 * and always writes the fresh result to the cache (forced refresh).
 *
 * **⚠️ Requires `@UseInterceptors(CacheInterceptor)` on the controller or method.**
 *
 * @example
 * ```typescript
 * @Post('refresh/:id')
 * @CachePut({ key: 'posts::id' })
 * @UseInterceptors(CacheInterceptor)
 * async refreshPost(@Param('id') id: string) {
 *   return this.postsService.findOne(id)
 * }
 * ```
 */
export function CachePut(options: CachePutOptions = {}): MethodDecorator {
	return function cachePutDecorator(
		targetOrMethod: object,
		_propertyKeyOrContext?: string | symbol | ClassMethodDecoratorContext,
		descriptor?: PropertyDescriptor,
	): PropertyDescriptor | undefined {
		const metadata = { operation: 'put', ...options }

		// Legacy decorator form (3 args): target, propertyKey, descriptor
		if (descriptor !== undefined) {
			Reflect.defineMetadata(CACHE_METADATA_KEY, metadata, descriptor.value)
			return descriptor
		}

		// Stage 3 TC39 decorator form (2 args): (fn, context)
		Reflect.defineMetadata(CACHE_METADATA_KEY, metadata, targetOrMethod)
	} as MethodDecorator
}
