import type {
	BaseEventPayload,
	EventHandler,
	EventHandlerOptions,
	EventHistoryEntry,
	EventName,
	EventPayload,
	RegisteredHandler,
	RequiredEventHandlerOptions,
} from '@magnet-cms/common'
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'

/**
 * Type-safe event service for decoupled communication between modules.
 *
 * Features:
 * - Type-safe events with payload validation
 * - Priority-based handler execution
 * - Async handlers that don't block the request
 * - Error isolation (one handler failure doesn't affect others)
 * - Event history for debugging
 *
 * @example
 * ```typescript
 * // Emitting events
 * await this.eventService.emit('content.created', {
 *   schema: 'posts',
 *   documentId: '123',
 * }, getEventContext())
 *
 * // Registering handlers programmatically
 * const unsubscribe = this.eventService.on('content.created', async (payload) => {
 *   console.log('Content created:', payload.documentId)
 * })
 *
 * // Or use the @OnEvent decorator
 * @OnEvent('content.created')
 * async handleContentCreated(payload: EventPayload<'content.created'>): Promise<void> {
 *   // ...
 * }
 * ```
 */
@Injectable()
export class EventService implements OnModuleDestroy {
	private readonly logger = new Logger(EventService.name)
	private readonly handlers = new Map<
		EventName,
		RegisteredHandler<EventName>[]
	>()
	private readonly eventHistory: EventHistoryEntry[] = []
	private readonly maxHistorySize = 1000

	/**
	 * Register an event handler
	 *
	 * @param event - The event name to listen for
	 * @param handler - The handler function
	 * @param options - Handler options (priority, async, name)
	 * @returns Unsubscribe function
	 */
	on<E extends EventName>(
		event: E,
		handler: EventHandler<E>,
		options: EventHandlerOptions = {},
	): () => void {
		const registeredHandler: RegisteredHandler<E> = {
			handler,
			options: {
				priority: options.priority ?? 100,
				async: options.async ?? false,
				name: options.name ?? (handler.name || 'anonymous'),
			},
		}

		const handlers = this.handlers.get(event) ?? []
		handlers.push(registeredHandler as RegisteredHandler<EventName>)

		// Sort by priority (lower first)
		handlers.sort((a, b) => a.options.priority - b.options.priority)

		this.handlers.set(event, handlers)

		this.logger.debug(
			`Registered handler '${registeredHandler.options.name}' for event '${event}'`,
		)

		// Return unsubscribe function
		return () => this.off(event, handler)
	}

	/**
	 * Unregister an event handler
	 *
	 * @param event - The event name
	 * @param handler - The handler function to remove
	 */
	off<E extends EventName>(event: E, handler: EventHandler<E>): void {
		const handlers = this.handlers.get(event)
		if (!handlers) return

		const index = handlers.findIndex((h) => h.handler === handler)
		if (index !== -1) {
			const [removed] = handlers.splice(index, 1)
			if (removed) {
				this.logger.debug(
					`Unregistered handler '${removed.options.name}' from event '${event}'`,
				)
			}
		}
	}

	/**
	 * Emit an event
	 *
	 * Executes sync handlers sequentially (awaiting each), then fires async
	 * handlers in parallel without waiting for them.
	 *
	 * @param event - The event name
	 * @param payload - The event payload (without base fields)
	 * @param context - Optional context (userId, requestId, ipAddress)
	 */
	async emit<E extends EventName>(
		event: E,
		payload: Omit<EventPayload<E>, keyof BaseEventPayload>,
		context?: Partial<BaseEventPayload>,
	): Promise<void> {
		const fullPayload = {
			...payload,
			timestamp: new Date(),
			userId: context?.userId,
			ipAddress: context?.ipAddress,
			requestId: context?.requestId,
		} as EventPayload<E>

		// Store in history
		this.addToHistory(event, fullPayload)

		const handlers = this.handlers.get(event)
		if (!handlers || handlers.length === 0) {
			this.logger.debug(`No handlers registered for event '${event}'`)
			return
		}

		this.logger.debug(
			`Emitting event '${event}' to ${handlers.length} handler(s)`,
		)

		// Separate sync and async handlers
		const syncHandlers = handlers.filter((h) => !h.options.async)
		const asyncHandlers = handlers.filter((h) => h.options.async)

		// Execute sync handlers sequentially
		for (const { handler, options } of syncHandlers) {
			try {
				await handler(fullPayload)
			} catch (error) {
				this.logHandlerError(event, options, error)
				// Continue to next handler - don't let one failure stop others
			}
		}

		// Execute async handlers in parallel (fire and forget)
		if (asyncHandlers.length > 0) {
			Promise.all(
				asyncHandlers.map(async ({ handler, options }) => {
					try {
						await handler(fullPayload)
					} catch (error) {
						this.logHandlerError(event, options, error)
					}
				}),
			).catch(() => {
				// Swallow - errors already logged
			})
		}
	}

	/**
	 * Emit multiple events
	 *
	 * Events are emitted sequentially in the order provided.
	 *
	 * @param events - Array of event objects with event name and payload
	 * @param context - Optional shared context for all events
	 */
	async emitBatch(
		events: Array<{ event: EventName; payload: Record<string, unknown> }>,
		context?: Partial<BaseEventPayload>,
	): Promise<void> {
		for (const { event, payload } of events) {
			await this.emit(
				event,
				payload as Omit<EventPayload<typeof event>, keyof BaseEventPayload>,
				context,
			)
		}
	}

	/**
	 * Get recent event history (for debugging)
	 *
	 * @param limit - Maximum number of events to return (default 100)
	 * @returns Array of recent events
	 */
	getHistory(limit = 100): EventHistoryEntry[] {
		return this.eventHistory.slice(-limit)
	}

	/**
	 * Get all registered handlers (for debugging)
	 *
	 * @returns Map of event names to handler info
	 */
	getHandlers(): Map<
		EventName,
		Array<{ name: string; priority: number; async: boolean }>
	> {
		const result = new Map<
			EventName,
			Array<{ name: string; priority: number; async: boolean }>
		>()

		for (const [event, handlers] of this.handlers) {
			result.set(
				event,
				handlers.map((h) => ({
					name: h.options.name,
					priority: h.options.priority,
					async: h.options.async,
				})),
			)
		}

		return result
	}

	/**
	 * Check if an event has any handlers registered
	 *
	 * @param event - The event name to check
	 * @returns True if at least one handler is registered
	 */
	hasHandlers(event: EventName): boolean {
		const handlers = this.handlers.get(event)
		return handlers !== undefined && handlers.length > 0
	}

	/**
	 * Get the number of handlers for an event
	 *
	 * @param event - The event name
	 * @returns Number of registered handlers
	 */
	getHandlerCount(event: EventName): number {
		const handlers = this.handlers.get(event)
		return handlers?.length ?? 0
	}

	/**
	 * Clear all handlers (for testing)
	 */
	clearAllHandlers(): void {
		this.handlers.clear()
		this.logger.warn('All event handlers cleared')
	}

	/**
	 * Clear event history (for testing)
	 */
	clearHistory(): void {
		this.eventHistory.length = 0
	}

	private addToHistory(event: EventName, payload: BaseEventPayload): void {
		this.eventHistory.push({ event, payload, timestamp: new Date() })

		// Trim history if too large
		if (this.eventHistory.length > this.maxHistorySize) {
			this.eventHistory.splice(
				0,
				this.eventHistory.length - this.maxHistorySize,
			)
		}
	}

	private logHandlerError(
		event: EventName,
		options: RequiredEventHandlerOptions,
		error: unknown,
	): void {
		const message = error instanceof Error ? error.message : 'Unknown error'
		const stack = error instanceof Error ? error.stack : undefined

		this.logger.error(
			`Handler '${options.name}' for event '${event}' failed: ${message}`,
			stack,
		)
	}

	onModuleDestroy(): void {
		this.logger.log('EventService shutting down')
		this.clearAllHandlers()
	}
}
