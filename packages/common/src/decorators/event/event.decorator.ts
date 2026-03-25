import { SetMetadata } from '@nestjs/common'

import type {
  EventHandlerMetadata,
  EventHandlerOptions,
  EventPayloadMap,
} from '../../types/events.types'

/**
 * Metadata key for event handler registration
 */
export const EVENT_HANDLER_METADATA = 'magnet:event_handler'

/**
 * Decorator to mark a method as an event handler
 *
 * Event handlers are automatically discovered and registered with the EventService
 * on module initialization.
 *
 * @param event - The event name to listen for
 * @param options - Optional handler configuration
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class ActivityService {
 *   @OnEvent('content.created', { priority: 10 })
 *   async logContentCreated(payload: EventPayload<'content.created'>): Promise<void> {
 *     await this.createActivityLog(payload)
 *   }
 *
 *   // Async handlers run in the background and don't block the request
 *   @OnEvent('user.login', { priority: 50, async: true })
 *   async sendWelcomeEmail(payload: EventPayload<'user.login'>): Promise<void> {
 *     await this.emailService.sendWelcome(payload.targetUserId)
 *   }
 * }
 * ```
 */
export function OnEvent(
  event: keyof EventPayloadMap,
  options: EventHandlerOptions = {},
): MethodDecorator {
  return <T>(
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> => {
    const metadata: EventHandlerMetadata = { event, options }
    SetMetadata(EVENT_HANDLER_METADATA, metadata)(
      target,
      propertyKey,
      descriptor as TypedPropertyDescriptor<unknown>,
    )
    return descriptor
  }
}
