import {
	type CallHandler,
	type ExecutionContext,
	Injectable,
	type NestInterceptor,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { type Observable, from, switchMap } from 'rxjs'
import { CACHE_METADATA_KEY, CACHE_TTL_KEY } from '../cache.constants'
import { CacheService } from '../cache.service'

interface CacheMetadata {
	operation: 'cacheable' | 'evict' | 'put'
	key?: string
	ttl?: number
	allEntries?: boolean
}

/**
 * Intercepts controller route handlers decorated with @Cacheable, @CacheEvict, or @CachePut.
 *
 * Apply via `@UseInterceptors(CacheInterceptor)` on a controller class or individual method.
 *
 * **⚠️ Only works on NestJS controller route handlers.** Plain service method calls are not
 * intercepted. For service-level caching, inject `CacheService` directly.
 *
 * @example
 * ```typescript
 * @Controller('posts')
 * @UseInterceptors(CacheInterceptor)
 * export class PostsController {
 *   @Get(':id')
 *   @Cacheable({ key: 'posts::id', ttl: 300 })
 *   async getPost(@Param('id') id: string) { ... }
 * }
 * ```
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
	constructor(
		private readonly cacheService: CacheService,
		private readonly reflector: Reflector,
	) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const handler = context.getHandler()
		const metadata = Reflect.getMetadata(CACHE_METADATA_KEY, handler) as
			| CacheMetadata
			| undefined

		if (!metadata) {
			return next.handle()
		}

		const ttl =
			metadata.ttl ??
			(Reflect.getMetadata(CACHE_TTL_KEY, handler) as number | undefined)

		switch (metadata.operation) {
			case 'cacheable':
				return this.handleCacheable(next, metadata.key, ttl)
			case 'evict':
				return this.handleEvict(next, metadata.key, metadata.allEntries)
			case 'put':
				return this.handlePut(next, metadata.key, ttl)
			default:
				return next.handle()
		}
	}

	private handleCacheable(
		next: CallHandler,
		key: string | undefined,
		ttl: number | undefined,
	): Observable<unknown> {
		return from(
			(async () => {
				if (key) {
					const cached = await this.cacheService.get(key)
					if (cached !== null) return cached
				}
				return null
			})(),
		).pipe(
			switchMap((cached) => {
				if (cached !== null) return from(Promise.resolve(cached))
				return next.handle().pipe(
					switchMap((result) =>
						from(
							(async () => {
								if (key) {
									await this.cacheService.set(key, result, ttl)
								}
								return result
							})(),
						),
					),
				)
			}),
		)
	}

	private handleEvict(
		next: CallHandler,
		key: string | undefined,
		allEntries: boolean | undefined,
	): Observable<unknown> {
		return next.handle().pipe(
			switchMap((result) =>
				from(
					(async () => {
						if (key) {
							if (allEntries) {
								await this.cacheService.deleteByPattern(key)
							} else {
								await this.cacheService.delete(key)
							}
						}
						return result
					})(),
				),
			),
		)
	}

	private handlePut(
		next: CallHandler,
		key: string | undefined,
		ttl: number | undefined,
	): Observable<unknown> {
		return next.handle().pipe(
			switchMap((result) =>
				from(
					(async () => {
						if (key) {
							await this.cacheService.set(key, result, ttl)
						}
						return result
					})(),
				),
			),
		)
	}
}
