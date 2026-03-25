import { Global, Module } from '@nestjs/common'

import { EventService } from './event.service'

/**
 * Events Module
 *
 * Provides a type-safe event system for decoupled communication between modules.
 *
 * This module is global, so EventService is available in all modules without
 * needing to import EventsModule.
 *
 * Features:
 * - Type-safe events with payload validation
 * - @OnEvent decorator for declarative handler registration
 * - Priority-based handler execution
 * - Async handlers that don't block the request
 * - Error isolation (one handler failure doesn't affect others)
 * - Event history for debugging
 *
 * @example
 * ```typescript
 * // Emitting events
 * @Injectable()
 * export class ContentService {
 *   constructor(private readonly eventService: EventService) {}
 *
 *   async create(data: CreateContentDto): Promise<Content> {
 *     const content = await this.model.create(data)
 *
 *     await this.eventService.emit(
 *       'content.created',
 *       { schema: 'posts', documentId: content.id },
 *       getEventContext()
 *     )
 *
 *     return content
 *   }
 * }
 *
 * // Handling events
 * @Injectable()
 * export class ActivityService {
 *   @OnEvent('content.created', { priority: 10 })
 *   async onContentCreated(payload: EventPayload<'content.created'>): Promise<void> {
 *     await this.createActivityLog(payload)
 *   }
 * }
 * ```
 */
@Global()
@Module({
  providers: [EventService],
  exports: [EventService],
})
export class EventsModule {}
