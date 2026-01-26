import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import {
	type CallHandler,
	type ExecutionContext,
	Injectable,
	type NestInterceptor,
} from '@nestjs/common'
import { Observable } from 'rxjs'

/**
 * Event context containing request-scoped information
 */
export interface EventContext {
	/** Request ID for tracing */
	requestId: string
	/** User who triggered the event (if applicable) */
	userId?: string
	/** IP address of the request (if applicable) */
	ipAddress?: string
	/** Timestamp when context was created */
	timestamp?: Date
}

/**
 * Request interface for type-safe access
 */
interface RequestWithUser {
	headers: Record<string, string | string[] | undefined>
	user?: { id?: string }
	ip?: string
}

/**
 * Async local storage for request context
 *
 * This allows event handlers to access request context (userId, requestId, etc.)
 * without explicit parameter passing.
 */
export const eventContextStorage = new AsyncLocalStorage<EventContext>()

/**
 * Interceptor that stores request context in AsyncLocalStorage.
 *
 * This allows event handlers to access the current request context
 * (userId, requestId, ipAddress) via getEventContext().
 *
 * @example
 * ```typescript
 * // In a service
 * import { getEventContext } from '@magnet/core'
 *
 * async create(data: CreateDto): Promise<Entity> {
 *   const entity = await this.model.create(data)
 *
 *   await this.eventService.emit(
 *     'content.created',
 *     { documentId: entity.id },
 *     getEventContext() // Gets userId, requestId, ipAddress from current request
 *   )
 *
 *   return entity
 * }
 * ```
 */
@Injectable()
export class EventContextInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<RequestWithUser>()

		const requestIdHeader = request.headers['x-request-id']
		const requestId =
			typeof requestIdHeader === 'string' ? requestIdHeader : randomUUID()

		const eventContext: EventContext = {
			requestId,
			userId: request.user?.id,
			ipAddress: request.ip,
		}

		return new Observable((subscriber) => {
			eventContextStorage.run(eventContext, () => {
				next.handle().subscribe({
					next: (value) => subscriber.next(value),
					error: (err: unknown) => subscriber.error(err),
					complete: () => subscriber.complete(),
				})
			})
		})
	}
}

/**
 * Get the current event context from AsyncLocalStorage.
 *
 * Returns undefined if called outside of an HTTP request context.
 *
 * @returns The current event context or undefined
 *
 * @example
 * ```typescript
 * const context = getEventContext()
 * if (context) {
 *   await this.eventService.emit('content.created', payload, context)
 * }
 * ```
 */
export function getEventContext(): EventContext | undefined {
	return eventContextStorage.getStore()
}

/**
 * Create a minimal event context (for use outside HTTP requests).
 *
 * Useful for background jobs, CLI commands, or tests.
 *
 * @param overrides - Optional context values to set
 * @returns A new EventContext object
 *
 * @example
 * ```typescript
 * // In a background job
 * const context = createEventContext({ userId: 'system' })
 * await this.eventService.emit('system.job_completed', payload, context)
 * ```
 */
export function createEventContext(
	overrides?: Partial<EventContext>,
): EventContext {
	return {
		requestId: overrides?.requestId ?? randomUUID(),
		userId: overrides?.userId,
		ipAddress: overrides?.ipAddress,
	}
}
