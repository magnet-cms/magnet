import { CACHE_TTL_KEY } from '../cache.constants'

/**
 * Override the TTL for a cached controller method.
 *
 * Compose with `@Cacheable()` or `@CachePut()` to set a per-method TTL
 * that overrides the adapter's default TTL.
 *
 * **⚠️ Requires `@UseInterceptors(CacheInterceptor)` on the controller or method.**
 *
 * @param seconds - Time-to-live in seconds
 *
 * @example
 * ```typescript
 * @Get('hot-data')
 * @Cacheable({ key: 'hot' })
 * @CacheTTL(30)
 * @UseInterceptors(CacheInterceptor)
 * async getHotData() {
 *   return this.dataService.getHot()
 * }
 * ```
 */
export function CacheTTL(seconds: number): MethodDecorator {
	return function cacheTTLDecorator(
		targetOrMethod: object,
		_propertyKeyOrContext?: string | symbol | ClassMethodDecoratorContext,
		descriptor?: PropertyDescriptor,
	): PropertyDescriptor | undefined {
		// Legacy decorator form (3 args): target, propertyKey, descriptor
		if (descriptor !== undefined) {
			Reflect.defineMetadata(CACHE_TTL_KEY, seconds, descriptor.value)
			return descriptor
		}

		// Stage 3 TC39 decorator form (2 args): (fn, context)
		Reflect.defineMetadata(CACHE_TTL_KEY, seconds, targetOrMethod)
	} as MethodDecorator
}
