import { CACHE_METADATA_KEY } from '../cache.constants'

export interface CacheableOptions {
	/**
	 * Cache key. Supports `:arg0`, `:arg1` placeholders for method arguments.
	 * If omitted, a default key is generated from the class name, method name,
	 * and serialized arguments.
	 */
	key?: string
	/** TTL override in seconds. If omitted, the interceptor uses @CacheTTL or adapter default. */
	ttl?: number
}

/**
 * Cache the return value of a controller method.
 *
 * On the first call with a given key, the method executes and the result is stored.
 * On subsequent calls with the same key (while not expired), the cached value is returned
 * without executing the method.
 *
 * **⚠️ Requires `@UseInterceptors(CacheInterceptor)` on the controller or method.**
 * Works on NestJS controller route handlers only — NOT on plain service methods.
 * For service-level caching, inject `CacheService` and call `get`/`set` directly.
 *
 * @example
 * ```typescript
 * @Get(':id')
 * @Cacheable({ key: 'posts::id', ttl: 300 })
 * @UseInterceptors(CacheInterceptor)
 * async getPost(@Param('id') id: string) {
 *   return this.postsService.findOne(id)
 * }
 * ```
 */
export function Cacheable(options: CacheableOptions = {}): MethodDecorator {
	return function cacheableDecorator(
		targetOrMethod: object,
		_propertyKeyOrContext?: string | symbol | ClassMethodDecoratorContext,
		descriptor?: PropertyDescriptor,
	): PropertyDescriptor | undefined {
		const metadata = { operation: 'cacheable', ...options }

		// Legacy decorator form (3 args): target, propertyKey, descriptor
		if (descriptor !== undefined) {
			Reflect.defineMetadata(CACHE_METADATA_KEY, metadata, descriptor.value)
			return descriptor
		}

		// Stage 3 TC39 decorator form (2 args): (fn, context)
		Reflect.defineMetadata(CACHE_METADATA_KEY, metadata, targetOrMethod)
	} as MethodDecorator
}
