# Plan 000b: Event System Foundation

**Status:** ✅ Completed
**Priority:** Critical
**Estimated Effort:** 1 week
**Depends on:** Plan 000 (Type Safety Remediation)

---

## Summary

Implement a type-safe, internal event system that enables decoupled communication between modules. This foundation is required by Plans 004 (History/Activity), 005 (Webhooks), 007 (Auth), and 008 (RBAC).

---

## Problem Statement

### Current State

Multiple plans reference an `EventService` that doesn't exist:

```typescript
// Plan 007 - Auth Enhancements
await this.eventService.emit('user.login', { userId: user.id })

// Plan 008 - RBAC
await this.eventService.emit('role.permissions_updated', { roleId, permissions })

// Plan 004 - Activity System
// Needs to listen for events to log activity

// Plan 005 - Webhooks
// Needs to listen for events to trigger webhook delivery
```

### Requirements

1. **Type-safe events** - Event names and payloads must be typed
2. **Async support** - Handlers can be async
3. **Multiple handlers** - Multiple modules can listen to same event
4. **Error isolation** - One handler failure shouldn't affect others
5. **Observability** - Events should be loggable for debugging
6. **Priority ordering** - Some handlers should run before others

---

## Proposed Solution

### 1. Event Type Definitions

```typescript
// packages/common/src/types/events.types.ts

/**
 * All event names in the system
 * Adding new events requires updating this union
 */
export type EventName =
  // Content events
  | 'content.created'
  | 'content.updated'
  | 'content.deleted'
  | 'content.published'
  | 'content.unpublished'
  | 'content.version.created'
  | 'content.version.restored'
  // User events
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.login'
  | 'user.logout'
  | 'user.logout_all'
  | 'user.password_changed'
  | 'user.password_reset_requested'
  | 'user.password_reset_completed'
  | 'user.email_verified'
  // Auth events
  | 'auth.token_refreshed'
  | 'auth.session_created'
  | 'auth.session_revoked'
  | 'auth.failed_login_attempt'
  // Role events
  | 'role.created'
  | 'role.updated'
  | 'role.deleted'
  | 'role.permissions_updated'
  | 'role.user_assigned'
  // Settings events
  | 'settings.updated'
  | 'settings.group_updated'
  // Media events
  | 'media.uploaded'
  | 'media.deleted'
  | 'media.folder_created'
  | 'media.folder_deleted'
  // API Key events
  | 'api_key.created'
  | 'api_key.revoked'
  | 'api_key.used'
  // Webhook events
  | 'webhook.created'
  | 'webhook.updated'
  | 'webhook.deleted'
  | 'webhook.delivery_success'
  | 'webhook.delivery_failed'
  // Plugin events
  | 'plugin.initialized'
  | 'plugin.destroyed'
  // System events
  | 'system.startup'
  | 'system.shutdown'

/**
 * Base event payload with common fields
 */
export interface BaseEventPayload {
  /** Timestamp when event was emitted */
  timestamp: Date
  /** User who triggered the event (if applicable) */
  userId?: string
  /** IP address of the request (if applicable) */
  ipAddress?: string
  /** Request ID for tracing */
  requestId?: string
}

/**
 * Event payload map - maps event names to their payload types
 */
export interface EventPayloadMap {
  // Content events
  'content.created': ContentEventPayload
  'content.updated': ContentEventPayload & { changes: FieldChange[] }
  'content.deleted': ContentEventPayload
  'content.published': ContentEventPayload
  'content.unpublished': ContentEventPayload
  'content.version.created': ContentVersionEventPayload
  'content.version.restored': ContentVersionEventPayload

  // User events
  'user.created': UserEventPayload
  'user.updated': UserEventPayload & { changes: string[] }
  'user.deleted': UserEventPayload
  'user.login': UserEventPayload & { sessionId?: string }
  'user.logout': UserEventPayload & { sessionId?: string }
  'user.logout_all': UserEventPayload
  'user.password_changed': UserEventPayload
  'user.password_reset_requested': UserEventPayload & { token?: string }
  'user.password_reset_completed': UserEventPayload
  'user.email_verified': UserEventPayload

  // Auth events
  'auth.token_refreshed': AuthEventPayload
  'auth.session_created': AuthEventPayload & { sessionId: string }
  'auth.session_revoked': AuthEventPayload & { sessionId: string; reason: string }
  'auth.failed_login_attempt': FailedLoginEventPayload

  // Role events
  'role.created': RoleEventPayload
  'role.updated': RoleEventPayload
  'role.deleted': RoleEventPayload
  'role.permissions_updated': RoleEventPayload & { permissions: string[] }
  'role.user_assigned': RoleEventPayload & { assignedUserId: string }

  // Settings events
  'settings.updated': SettingsEventPayload
  'settings.group_updated': SettingsGroupEventPayload

  // Media events
  'media.uploaded': MediaEventPayload
  'media.deleted': MediaEventPayload
  'media.folder_created': MediaFolderEventPayload
  'media.folder_deleted': MediaFolderEventPayload

  // API Key events
  'api_key.created': ApiKeyEventPayload
  'api_key.revoked': ApiKeyEventPayload & { reason?: string }
  'api_key.used': ApiKeyEventPayload & { endpoint: string }

  // Webhook events
  'webhook.created': WebhookEventPayload
  'webhook.updated': WebhookEventPayload
  'webhook.deleted': WebhookEventPayload
  'webhook.delivery_success': WebhookDeliveryEventPayload
  'webhook.delivery_failed': WebhookDeliveryEventPayload & { error: string }

  // Plugin events
  'plugin.initialized': PluginEventPayload
  'plugin.destroyed': PluginEventPayload

  // System events
  'system.startup': SystemEventPayload
  'system.shutdown': SystemEventPayload
}

/**
 * Content event payload
 */
export interface ContentEventPayload extends BaseEventPayload {
  schema: string
  documentId: string
  locale?: string
}

/**
 * Content version event payload
 */
export interface ContentVersionEventPayload extends ContentEventPayload {
  version: number
  previousVersion?: number
}

/**
 * Field change record
 */
export interface FieldChange {
  field: string
  oldValue: unknown
  newValue: unknown
}

/**
 * User event payload
 */
export interface UserEventPayload extends BaseEventPayload {
  targetUserId: string
  email?: string
}

/**
 * Auth event payload
 */
export interface AuthEventPayload extends BaseEventPayload {
  userId: string
}

/**
 * Failed login event payload
 */
export interface FailedLoginEventPayload extends BaseEventPayload {
  email: string
  reason: 'invalid_password' | 'user_not_found' | 'account_locked' | 'email_not_verified'
}

/**
 * Role event payload
 */
export interface RoleEventPayload extends BaseEventPayload {
  roleId: string
  roleName: string
}

/**
 * Settings event payload
 */
export interface SettingsEventPayload extends BaseEventPayload {
  key: string
  oldValue: unknown
  newValue: unknown
}

/**
 * Settings group event payload
 */
export interface SettingsGroupEventPayload extends BaseEventPayload {
  group: string
  changes: Array<{ key: string; oldValue: unknown; newValue: unknown }>
}

/**
 * Media event payload
 */
export interface MediaEventPayload extends BaseEventPayload {
  fileId: string
  filename: string
  mimeType: string
  size: number
  folder?: string
}

/**
 * Media folder event payload
 */
export interface MediaFolderEventPayload extends BaseEventPayload {
  folderId: string
  folderName: string
  parentFolder?: string
}

/**
 * API Key event payload
 */
export interface ApiKeyEventPayload extends BaseEventPayload {
  apiKeyId: string
  name: string
}

/**
 * Webhook event payload
 */
export interface WebhookEventPayload extends BaseEventPayload {
  webhookId: string
  url: string
  events: string[]
}

/**
 * Webhook delivery event payload
 */
export interface WebhookDeliveryEventPayload extends BaseEventPayload {
  webhookId: string
  deliveryId: string
  event: string
  statusCode?: number
  duration?: number
}

/**
 * Plugin event payload
 */
export interface PluginEventPayload extends BaseEventPayload {
  pluginName: string
  version: string
}

/**
 * System event payload
 */
export interface SystemEventPayload extends BaseEventPayload {
  version: string
  environment: string
}

/**
 * Get payload type for an event name
 */
export type EventPayload<E extends EventName> = EventPayloadMap[E]

/**
 * Event handler function type
 */
export type EventHandler<E extends EventName> = (
  payload: EventPayload<E>
) => Promise<void> | void

/**
 * Event handler options
 */
export interface EventHandlerOptions {
  /** Priority (lower runs first, default 100) */
  priority?: number
  /** Whether handler should run async (non-blocking) */
  async?: boolean
  /** Handler name for debugging */
  name?: string
}

/**
 * Registered handler with metadata
 */
export interface RegisteredHandler<E extends EventName> {
  handler: EventHandler<E>
  options: Required<EventHandlerOptions>
}
```

### 2. Event Service Implementation

```typescript
// packages/core/src/modules/events/event.service.ts

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import type {
  EventName,
  EventPayload,
  EventHandler,
  EventHandlerOptions,
  RegisteredHandler,
  BaseEventPayload,
} from '@magnet/common'

@Injectable()
export class EventService implements OnModuleDestroy {
  private readonly logger = new Logger(EventService.name)
  private readonly handlers = new Map<EventName, RegisteredHandler<EventName>[]>()
  private readonly eventHistory: Array<{ event: EventName; payload: BaseEventPayload; timestamp: Date }> = []
  private readonly maxHistorySize = 1000

  /**
   * Register an event handler
   */
  on<E extends EventName>(
    event: E,
    handler: EventHandler<E>,
    options: EventHandlerOptions = {}
  ): () => void {
    const registeredHandler: RegisteredHandler<E> = {
      handler,
      options: {
        priority: options.priority ?? 100,
        async: options.async ?? false,
        name: options.name ?? handler.name || 'anonymous',
      },
    }

    const handlers = this.handlers.get(event) ?? []
    handlers.push(registeredHandler as RegisteredHandler<EventName>)

    // Sort by priority (lower first)
    handlers.sort((a, b) => a.options.priority - b.options.priority)

    this.handlers.set(event, handlers)

    this.logger.debug(`Registered handler '${registeredHandler.options.name}' for event '${event}'`)

    // Return unsubscribe function
    return () => this.off(event, handler)
  }

  /**
   * Unregister an event handler
   */
  off<E extends EventName>(event: E, handler: EventHandler<E>): void {
    const handlers = this.handlers.get(event)
    if (!handlers) return

    const index = handlers.findIndex((h) => h.handler === handler)
    if (index !== -1) {
      const removed = handlers.splice(index, 1)[0]
      this.logger.debug(`Unregistered handler '${removed.options.name}' from event '${event}'`)
    }
  }

  /**
   * Emit an event
   */
  async emit<E extends EventName>(
    event: E,
    payload: Omit<EventPayload<E>, keyof BaseEventPayload>,
    context?: Partial<BaseEventPayload>
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

    this.logger.debug(`Emitting event '${event}' to ${handlers.length} handler(s)`)

    // Separate sync and async handlers
    const syncHandlers = handlers.filter((h) => !h.options.async)
    const asyncHandlers = handlers.filter((h) => h.options.async)

    // Execute sync handlers sequentially
    for (const { handler, options } of syncHandlers) {
      try {
        await handler(fullPayload)
      } catch (error) {
        this.logger.error(
          `Handler '${options.name}' for event '${event}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined
        )
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
            this.logger.error(
              `Async handler '${options.name}' for event '${event}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              error instanceof Error ? error.stack : undefined
            )
          }
        })
      ).catch(() => {
        // Swallow - errors already logged
      })
    }
  }

  /**
   * Emit multiple events atomically
   */
  async emitBatch(
    events: Array<{ event: EventName; payload: Record<string, unknown> }>,
    context?: Partial<BaseEventPayload>
  ): Promise<void> {
    for (const { event, payload } of events) {
      await this.emit(event, payload as Omit<EventPayload<typeof event>, keyof BaseEventPayload>, context)
    }
  }

  /**
   * Get recent event history (for debugging)
   */
  getHistory(limit = 100): Array<{ event: EventName; payload: BaseEventPayload; timestamp: Date }> {
    return this.eventHistory.slice(-limit)
  }

  /**
   * Get all registered handlers (for debugging)
   */
  getHandlers(): Map<EventName, Array<{ name: string; priority: number; async: boolean }>> {
    const result = new Map<EventName, Array<{ name: string; priority: number; async: boolean }>>()

    for (const [event, handlers] of this.handlers) {
      result.set(
        event,
        handlers.map((h) => ({
          name: h.options.name,
          priority: h.options.priority,
          async: h.options.async,
        }))
      )
    }

    return result
  }

  /**
   * Check if event has handlers
   */
  hasHandlers(event: EventName): boolean {
    const handlers = this.handlers.get(event)
    return handlers !== undefined && handlers.length > 0
  }

  /**
   * Clear all handlers (for testing)
   */
  clearAllHandlers(): void {
    this.handlers.clear()
    this.logger.warn('All event handlers cleared')
  }

  private addToHistory(event: EventName, payload: BaseEventPayload): void {
    this.eventHistory.push({ event, payload, timestamp: new Date() })

    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.splice(0, this.eventHistory.length - this.maxHistorySize)
    }
  }

  onModuleDestroy(): void {
    this.logger.log('EventService shutting down')
    this.clearAllHandlers()
  }
}
```

### 3. Event Decorators

```typescript
// packages/common/src/decorators/event.decorator.ts

import { SetMetadata } from '@nestjs/common'
import type { EventName, EventHandlerOptions } from '../types/events.types'

export const EVENT_HANDLER_METADATA = 'magnet:event_handler'

export interface EventHandlerMetadata {
  event: EventName
  options: EventHandlerOptions
}

/**
 * Decorator to mark a method as an event handler
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class ActivityService {
 *   @OnEvent('content.created', { priority: 10 })
 *   async logContentCreated(payload: EventPayload<'content.created'>) {
 *     await this.createActivityLog(payload)
 *   }
 * }
 * ```
 */
export function OnEvent(
  event: EventName,
  options: EventHandlerOptions = {}
): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const metadata: EventHandlerMetadata = { event, options }
    SetMetadata(EVENT_HANDLER_METADATA, metadata)(target, propertyKey, descriptor)
    return descriptor
  }
}
```

### 4. Event Handler Discovery

```typescript
// packages/core/src/modules/events/event-handler-discovery.service.ts

import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core'
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper'
import { EVENT_HANDLER_METADATA, EventHandlerMetadata } from '@magnet/common'
import { EventService } from './event.service'

@Injectable()
export class EventHandlerDiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(EventHandlerDiscoveryService.name)

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly eventService: EventService
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

      const prototype = Object.getPrototypeOf(instance)

      this.metadataScanner.scanFromPrototype(instance, prototype, (methodName) => {
        const method = prototype[methodName]
        const metadata = this.reflector.get<EventHandlerMetadata>(
          EVENT_HANDLER_METADATA,
          method
        )

        if (metadata) {
          const boundHandler = (instance[methodName] as Function).bind(instance)

          this.eventService.on(metadata.event, boundHandler, {
            ...metadata.options,
            name: `${instance.constructor.name}.${methodName}`,
          })

          handlerCount++
          this.logger.debug(
            `Discovered handler: ${instance.constructor.name}.${methodName} for event '${metadata.event}'`
          )
        }
      })
    }

    this.logger.log(`Discovered ${handlerCount} event handler(s)`)
  }
}
```

### 5. Events Module

```typescript
// packages/core/src/modules/events/events.module.ts

import { Global, Module } from '@nestjs/common'
import { DiscoveryModule } from '@nestjs/core'
import { EventService } from './event.service'
import { EventHandlerDiscoveryService } from './event-handler-discovery.service'

@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [EventService, EventHandlerDiscoveryService],
  exports: [EventService],
})
export class EventsModule {}
```

### 6. Request Context for Events

```typescript
// packages/core/src/modules/events/event-context.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { v4 as uuidv4 } from 'uuid'
import { AsyncLocalStorage } from 'async_hooks'
import type { BaseEventPayload } from '@magnet/common'

export interface EventContext extends Partial<BaseEventPayload> {
  requestId: string
}

// Async local storage for request context
export const eventContextStorage = new AsyncLocalStorage<EventContext>()

@Injectable()
export class EventContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest()

    const eventContext: EventContext = {
      requestId: request.headers['x-request-id'] ?? uuidv4(),
      userId: request.user?.id,
      ipAddress: request.ip,
    }

    return new Observable((subscriber) => {
      eventContextStorage.run(eventContext, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        })
      })
    })
  }
}

/**
 * Get current event context
 */
export function getEventContext(): EventContext | undefined {
  return eventContextStorage.getStore()
}
```

### 7. Usage Examples

```typescript
// Example: Content Service emitting events

import { EventService, getEventContext } from '@magnet/core'

@Injectable()
export class ContentService {
  constructor(private readonly eventService: EventService) {}

  async create(schema: string, data: CreateContentDto): Promise<Content> {
    const content = await this.model.create(data)

    await this.eventService.emit(
      'content.created',
      {
        schema,
        documentId: content.id,
        locale: data.locale,
      },
      getEventContext()
    )

    return content
  }

  async update(schema: string, id: string, data: UpdateContentDto): Promise<Content> {
    const oldContent = await this.model.findById(id)
    const newContent = await this.model.updateById(id, data)

    const changes = this.computeChanges(oldContent, newContent)

    await this.eventService.emit(
      'content.updated',
      {
        schema,
        documentId: id,
        locale: data.locale,
        changes,
      },
      getEventContext()
    )

    return newContent
  }
}

// Example: Activity Service listening to events

@Injectable()
export class ActivityService {
  constructor(private readonly activityModel: Model<Activity>) {}

  @OnEvent('content.created', { priority: 10 })
  async onContentCreated(payload: EventPayload<'content.created'>): Promise<void> {
    await this.activityModel.create({
      type: 'content.created',
      userId: payload.userId,
      resourceType: 'content',
      resourceId: payload.documentId,
      schema: payload.schema,
      timestamp: payload.timestamp,
      ipAddress: payload.ipAddress,
    })
  }

  @OnEvent('content.updated', { priority: 10 })
  async onContentUpdated(payload: EventPayload<'content.updated'>): Promise<void> {
    await this.activityModel.create({
      type: 'content.updated',
      userId: payload.userId,
      resourceType: 'content',
      resourceId: payload.documentId,
      schema: payload.schema,
      timestamp: payload.timestamp,
      metadata: { changes: payload.changes },
    })
  }

  @OnEvent('user.login', { priority: 10 })
  async onUserLogin(payload: EventPayload<'user.login'>): Promise<void> {
    await this.activityModel.create({
      type: 'user.login',
      userId: payload.targetUserId,
      resourceType: 'user',
      resourceId: payload.targetUserId,
      timestamp: payload.timestamp,
      ipAddress: payload.ipAddress,
    })
  }
}

// Example: Webhook Service listening to events

@Injectable()
export class WebhookService {
  @OnEvent('content.created', { priority: 100, async: true })
  async triggerWebhooks(payload: EventPayload<'content.created'>): Promise<void> {
    const webhooks = await this.findWebhooksForEvent('content.created')

    for (const webhook of webhooks) {
      await this.deliverWebhook(webhook, 'content.created', payload)
    }
  }
}
```

---

## Implementation Phases

### Phase 1: Type Definitions (Day 1)
- [x] Create `packages/common/src/types/events.types.ts`
- [x] Define all event names
- [x] Define all payload types
- [x] Export from common package

### Phase 2: Event Service (Days 2-3)
- [x] Create `EventService` with emit/on/off methods
- [x] Implement priority ordering
- [x] Implement async handlers
- [x] Implement error isolation
- [x] Add event history for debugging

### Phase 3: Decorators & Discovery (Days 4-5)
- [x] Create `@OnEvent` decorator
- [x] Create `EventHandlerDiscoveryService`
- [x] Create `EventsModule`
- [x] Add request context interceptor

### Phase 4: Integration (Days 6-7)
- [x] Register `EventsModule` in `MagnetModule`
- [x] Add `EventContextInterceptor` available (global registration left for consumer)
- [ ] Update `ContentService` to emit events (deferred to service implementations)
- [ ] Update `AuthService` to emit events (deferred to service implementations)
- [ ] Write integration tests (deferred)

---

## File Changes Summary

### New Files
| Path | Description |
|------|-------------|
| `packages/common/src/types/events.types.ts` | Event type definitions |
| `packages/common/src/decorators/event.decorator.ts` | @OnEvent decorator |
| `packages/core/src/modules/events/event.service.ts` | Event service |
| `packages/core/src/modules/events/event-handler-discovery.service.ts` | Handler discovery |
| `packages/core/src/modules/events/event-context.interceptor.ts` | Request context |
| `packages/core/src/modules/events/events.module.ts` | Events module |
| `packages/core/src/modules/events/index.ts` | Barrel export |

### Modified Files
| Path | Changes |
|------|---------|
| `packages/common/src/index.ts` | Export event types and decorators |
| `packages/core/src/magnet.module.ts` | Import EventsModule |
| `packages/core/src/index.ts` | Export EventService |

---

## Success Criteria

1. `EventService` can emit typed events
2. `@OnEvent` decorator registers handlers automatically
3. Handlers execute in priority order
4. Async handlers don't block the request
5. Handler errors are isolated (one failure doesn't stop others)
6. Event context (userId, requestId) is propagated
7. Event history is accessible for debugging
8. All event names and payloads are fully typed

---

## Dependencies

- **Depends on:** Plan 000 (Type Safety)
- **Blocks:** Plan 004 (History/Activity), Plan 005 (Webhooks), Plan 007 (Auth), Plan 008 (RBAC)
