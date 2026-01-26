import {
	EVENT_HANDLER_METADATA,
	type EventHandlerMetadata,
	type EventName,
} from '@magnet-cms/common'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core'
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper'
import { EventService } from './event.service'

/**
 * Service that discovers @OnEvent decorated methods and registers them with EventService.
 *
 * This service runs on module initialization and scans all providers for methods
 * decorated with @OnEvent. Found handlers are automatically registered with the
 * EventService.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class ActivityService {
 *   @OnEvent('content.created', { priority: 10 })
 *   async onContentCreated(payload: EventPayload<'content.created'>): Promise<void> {
 *     // This method will be automatically discovered and registered
 *   }
 * }
 * ```
 */
@Injectable()
export class EventHandlerDiscoveryService implements OnModuleInit {
	private readonly logger = new Logger(EventHandlerDiscoveryService.name)

	constructor(
		private readonly discoveryService: DiscoveryService,
		private readonly metadataScanner: MetadataScanner,
		private readonly reflector: Reflector,
		private readonly eventService: EventService,
	) {}

	onModuleInit(): void {
		this.discoverEventHandlers()
	}

	private discoverEventHandlers(): void {
		const providers = this.discoveryService.getProviders()
		let handlerCount = 0

		for (const wrapper of providers) {
			const { instance } = wrapper as InstanceWrapper

			if (!instance || typeof instance !== 'object') {
				continue
			}

			const prototype = Object.getPrototypeOf(instance) as object

			this.metadataScanner.scanFromPrototype(
				instance,
				prototype,
				(methodName: string) => {
					const method = prototype[methodName as keyof typeof prototype]
					if (typeof method !== 'function') {
						return
					}

					const metadata = this.reflector.get<EventHandlerMetadata | undefined>(
						EVENT_HANDLER_METADATA,
						method,
					)

					if (metadata) {
						const instanceObj = instance as Record<string, unknown>
						const methodFn = instanceObj[methodName]

						if (typeof methodFn === 'function') {
							const boundHandler = methodFn.bind(instance) as (
								payload: unknown,
							) => Promise<void> | void
							const handlerName = `${instance.constructor.name}.${methodName}`

							this.eventService.on(metadata.event as EventName, boundHandler, {
								...metadata.options,
								name: handlerName,
							})

							handlerCount++
							this.logger.debug(
								`Discovered handler: ${handlerName} for event '${metadata.event}'`,
							)
						}
					}
				},
			)
		}

		this.logger.log(`Discovered ${handlerCount} event handler(s)`)
	}
}
