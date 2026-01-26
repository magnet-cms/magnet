# Plan 005: Webhooks System

**Status:** Proposed
**Priority:** Medium
**Estimated Effort:** 2 weeks
**Depends on:** Plan 000 (Type Safety), Plan 000b (Event System - required for event subscriptions)

---

## Summary

Implement an event-driven webhook system with reliable delivery, retry logic, and comprehensive management.

---

## Current State

**What Exists:** Event system from Plan 000b provides the foundation.

**What's Needed:**
- Event emitter infrastructure
- Webhook registration and management
- Reliable delivery with retries
- Signature verification
- Delivery logs and debugging
- Admin UI for webhook management

---

## Proposed Implementation

### 1. Event System

```typescript
// packages/common/src/types/events.types.ts

export type MagnetEvent =
  // Content events
  | 'content.created'
  | 'content.updated'
  | 'content.deleted'
  | 'content.published'
  | 'content.unpublished'
  | 'content.restored'
  // User events
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.login'
  | 'user.logout'
  // Media events
  | 'media.uploaded'
  | 'media.deleted'
  // Settings events
  | 'settings.updated'
  // Custom events
  | `custom.${string}`

export interface EventPayload<T = unknown> {
  event: MagnetEvent
  timestamp: string
  data: T
  meta: {
    schemaName?: string
    documentId?: string
    userId?: string
    locale?: string
  }
}
```

### 2. Event Emitter Service

```typescript
@Injectable()
export class EventService {
  private readonly emitter = new EventEmitter2()

  constructor(
    private webhookService: WebhookService,
    private activityService: ActivityService,
  ) {}

  /**
   * Emit an event
   */
  async emit<T>(event: MagnetEvent, data: T, meta?: EventMeta): Promise<void> {
    const payload: EventPayload<T> = {
      event,
      timestamp: new Date().toISOString(),
      data,
      meta: meta || {},
    }

    // Emit locally for in-process subscribers
    this.emitter.emit(event, payload)
    this.emitter.emit('*', payload)  // Wildcard subscribers

    // Trigger webhook delivery
    await this.webhookService.deliver(payload)
  }

  /**
   * Subscribe to events (in-process)
   */
  on(event: MagnetEvent | '*', handler: (payload: EventPayload) => void): void {
    this.emitter.on(event, handler)
  }

  /**
   * Unsubscribe
   */
  off(event: MagnetEvent | '*', handler: (payload: EventPayload) => void): void {
    this.emitter.off(event, handler)
  }
}
```

### 3. Webhook Schema

```typescript
@Schema({ versioning: false, i18n: false })
export class Webhook {
  @Prop({ required: true })
  name: string

  @Prop({ required: true })
  url: string  // Endpoint URL

  @Prop({ required: true, type: [String] })
  events: MagnetEvent[]  // Events to subscribe to

  @Prop({ required: true, default: true })
  enabled: boolean

  @Prop()
  secret?: string  // For signature verification

  @Prop({ type: Object })
  headers?: Record<string, string>  // Custom headers

  @Prop({ default: 3 })
  maxRetries: number

  @Prop({ default: 30000 })
  timeout: number  // ms

  @Prop({ type: [String] })
  schemaFilters?: string[]  // Only trigger for specific schemas

  @Prop()
  description?: string

  @Prop({ default: () => new Date() })
  createdAt: Date

  @Prop()
  lastTriggeredAt?: Date

  @Prop({ default: 0 })
  successCount: number

  @Prop({ default: 0 })
  failureCount: number
}
```

### 4. Webhook Delivery Schema

```typescript
@Schema({ versioning: false, i18n: false })
export class WebhookDelivery {
  @Prop({ required: true, index: true })
  webhookId: string

  @Prop({ required: true })
  event: MagnetEvent

  @Prop({ required: true, type: Mixed })
  payload: EventPayload

  @Prop({ required: true })
  status: 'pending' | 'success' | 'failed' | 'retrying'

  @Prop({ default: 0 })
  attempts: number

  @Prop()
  nextRetryAt?: Date

  @Prop()
  responseStatus?: number

  @Prop()
  responseBody?: string

  @Prop()
  error?: string

  @Prop()
  duration?: number  // ms

  @Prop({ default: () => new Date() })
  createdAt: Date

  @Prop()
  completedAt?: Date
}
```

### 5. Webhook Service

```typescript
@Injectable()
export class WebhookService {
  constructor(
    @Inject(WEBHOOK_MODEL) private webhookModel: Model<Webhook>,
    @Inject(WEBHOOK_DELIVERY_MODEL) private deliveryModel: Model<WebhookDelivery>,
    private settings: SettingsService,
  ) {}

  /**
   * Deliver event to all matching webhooks
   */
  async deliver(payload: EventPayload): Promise<void> {
    const webhooks = await this.findMatchingWebhooks(payload.event, payload.meta.schemaName)

    await Promise.all(
      webhooks.map(webhook => this.deliverToWebhook(webhook, payload))
    )
  }

  /**
   * Find webhooks subscribed to this event
   */
  private async findMatchingWebhooks(event: MagnetEvent, schemaName?: string): Promise<Webhook[]> {
    const query: FilterQuery<Webhook> = {
      enabled: true,
      events: { $in: [event, '*'] },
    }

    if (schemaName) {
      query.$or = [
        { schemaFilters: { $exists: false } },
        { schemaFilters: { $size: 0 } },
        { schemaFilters: schemaName },
      ]
    }

    return this.webhookModel.find(query)
  }

  /**
   * Deliver to a specific webhook
   */
  private async deliverToWebhook(webhook: Webhook, payload: EventPayload): Promise<void> {
    const delivery = await this.deliveryModel.create({
      webhookId: webhook._id,
      event: payload.event,
      payload,
      status: 'pending',
      attempts: 0,
    })

    await this.attemptDelivery(webhook, delivery)
  }

  /**
   * Attempt delivery with retries
   */
  private async attemptDelivery(webhook: Webhook, delivery: WebhookDelivery): Promise<void> {
    const startTime = Date.now()

    try {
      const signature = this.generateSignature(webhook.secret, delivery.payload)

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Magnet-Event': delivery.event,
          'X-Magnet-Signature': signature,
          'X-Magnet-Delivery': delivery._id.toString(),
          'X-Magnet-Timestamp': delivery.payload.timestamp,
          ...webhook.headers,
        },
        body: JSON.stringify(delivery.payload),
        signal: AbortSignal.timeout(webhook.timeout),
      })

      const duration = Date.now() - startTime

      if (response.ok) {
        await this.markSuccess(webhook, delivery, response.status, duration)
      } else {
        await this.handleFailure(webhook, delivery, response.status, await response.text(), duration)
      }
    } catch (error) {
      const duration = Date.now() - startTime
      await this.handleFailure(webhook, delivery, null, error.message, duration)
    }
  }

  /**
   * Generate HMAC signature
   */
  private generateSignature(secret: string | undefined, payload: EventPayload): string {
    if (!secret) return ''

    const hmac = createHmac('sha256', secret)
    hmac.update(JSON.stringify(payload))
    return `sha256=${hmac.digest('hex')}`
  }

  /**
   * Mark delivery as successful
   */
  private async markSuccess(
    webhook: Webhook,
    delivery: WebhookDelivery,
    status: number,
    duration: number,
  ): Promise<void> {
    await this.deliveryModel.updateOne(
      { _id: delivery._id },
      {
        status: 'success',
        responseStatus: status,
        duration,
        completedAt: new Date(),
        attempts: delivery.attempts + 1,
      },
    )

    await this.webhookModel.updateOne(
      { _id: webhook._id },
      {
        $inc: { successCount: 1 },
        lastTriggeredAt: new Date(),
      },
    )
  }

  /**
   * Handle failed delivery with retry logic
   */
  private async handleFailure(
    webhook: Webhook,
    delivery: WebhookDelivery,
    status: number | null,
    error: string,
    duration: number,
  ): Promise<void> {
    const attempts = delivery.attempts + 1
    const shouldRetry = attempts < webhook.maxRetries

    if (shouldRetry) {
      // Exponential backoff: 1m, 5m, 30m
      const delays = [60, 300, 1800]
      const delaySeconds = delays[Math.min(attempts - 1, delays.length - 1)]
      const nextRetryAt = new Date(Date.now() + delaySeconds * 1000)

      await this.deliveryModel.updateOne(
        { _id: delivery._id },
        {
          status: 'retrying',
          attempts,
          responseStatus: status,
          error,
          duration,
          nextRetryAt,
        },
      )

      // Schedule retry (using bull queue or setTimeout)
      this.scheduleRetry(webhook, delivery._id, delaySeconds)
    } else {
      await this.deliveryModel.updateOne(
        { _id: delivery._id },
        {
          status: 'failed',
          attempts,
          responseStatus: status,
          error,
          duration,
          completedAt: new Date(),
        },
      )

      await this.webhookModel.updateOne(
        { _id: webhook._id },
        {
          $inc: { failureCount: 1 },
          lastTriggeredAt: new Date(),
        },
      )
    }
  }

  /**
   * Retry pending deliveries (called by cron or queue)
   */
  async retryPendingDeliveries(): Promise<void> {
    const pendingDeliveries = await this.deliveryModel.find({
      status: 'retrying',
      nextRetryAt: { $lte: new Date() },
    })

    for (const delivery of pendingDeliveries) {
      const webhook = await this.webhookModel.findById(delivery.webhookId)
      if (webhook && webhook.enabled) {
        await this.attemptDelivery(webhook, delivery)
      }
    }
  }

  // CRUD operations
  async create(data: CreateWebhookDto): Promise<Webhook> { ... }
  async update(id: string, data: UpdateWebhookDto): Promise<Webhook> { ... }
  async delete(id: string): Promise<void> { ... }
  async findAll(): Promise<Webhook[]> { ... }
  async findById(id: string): Promise<Webhook | null> { ... }
  async getDeliveries(webhookId: string, limit?: number): Promise<WebhookDelivery[]> { ... }
  async testWebhook(id: string): Promise<WebhookDelivery> { ... }
}
```

### 6. Webhook Settings

```typescript
@Settings({
  group: 'webhooks',
  label: 'Webhooks',
  icon: 'webhook',
  order: 40,
})
export class WebhookSettings {
  @Setting.Boolean({ label: 'Enable Webhooks' })
  enabled: boolean = true

  @Setting.Number({
    label: 'Default Timeout (seconds)',
    min: 5,
    max: 60,
  })
  defaultTimeout: number = 30

  @Setting.Number({
    label: 'Default Max Retries',
    min: 0,
    max: 10,
  })
  defaultMaxRetries: number = 3

  @Setting.Number({
    label: 'Delivery Log Retention (days)',
    min: 1,
    max: 90,
  })
  deliveryRetentionDays: number = 7

  @Setting.Boolean({
    label: 'Log Request Bodies',
    description: 'Store full payloads in delivery logs',
  })
  logRequestBodies: boolean = true

  @Setting.Boolean({
    label: 'Log Response Bodies',
    description: 'Store response bodies in delivery logs',
  })
  logResponseBodies: boolean = true
}
```

### 7. Event Integration

Emit events from existing services:

```typescript
// In ContentService
async create(schemaName: string, data: object): Promise<Document> {
  const document = await this.model.create(data)

  await this.eventService.emit('content.created', document, {
    schemaName,
    documentId: document.id,
    userId: this.request.user?.id,
  })

  return document
}

async publish(schemaName: string, documentId: string): Promise<Document> {
  const document = await this.model.publish(documentId)

  await this.eventService.emit('content.published', document, {
    schemaName,
    documentId,
    userId: this.request.user?.id,
  })

  return document
}
```

---

## API Endpoints

```
# Webhook Management
GET    /api/webhooks                      # List all webhooks
POST   /api/webhooks                      # Create webhook
GET    /api/webhooks/:id                  # Get webhook
PUT    /api/webhooks/:id                  # Update webhook
DELETE /api/webhooks/:id                  # Delete webhook
POST   /api/webhooks/:id/test             # Send test event

# Delivery Logs
GET    /api/webhooks/:id/deliveries       # Get deliveries for webhook
GET    /api/webhooks/deliveries/:id       # Get specific delivery
POST   /api/webhooks/deliveries/:id/retry # Retry failed delivery

# Events (for debugging)
GET    /api/events                        # List available events
```

---

## File Changes Summary

### New Files
| Path | Description |
|------|-------------|
| `packages/common/src/types/events.types.ts` | Event type definitions |
| `packages/core/src/modules/events/events.module.ts` | Events module |
| `packages/core/src/modules/events/events.service.ts` | Event emitter service |
| `packages/core/src/modules/webhooks/webhooks.module.ts` | Webhooks module |
| `packages/core/src/modules/webhooks/webhooks.service.ts` | Webhook management |
| `packages/core/src/modules/webhooks/webhooks.controller.ts` | Webhook endpoints |
| `packages/core/src/modules/webhooks/schemas/webhook.schema.ts` | Webhook schema |
| `packages/core/src/modules/webhooks/schemas/webhook-delivery.schema.ts` | Delivery schema |
| `packages/core/src/modules/webhooks/webhooks.settings.ts` | Webhook settings |

### Modified Files
| Path | Changes |
|------|---------|
| `packages/core/src/modules/content/content.service.ts` | Emit events on CRUD |
| `packages/core/src/modules/auth/auth.service.ts` | Emit auth events |
| `packages/core/src/modules/storage/storage.service.ts` | Emit media events |
| `packages/core/src/magnet.module.ts` | Import EventsModule, WebhooksModule |

---

## Admin UI

### Webhook Management Page
- List webhooks with status indicators
- Create/edit webhook form
- Event selection with checkboxes
- Schema filter multi-select
- Test webhook button

### Delivery Logs View
- Delivery history with status badges
- Request/response details
- Retry button for failed deliveries
- Filter by status, date range

---

## Signature Verification (Client Side)

```typescript
// Example: Verifying webhook signature in your endpoint
import { createHmac, timingSafeEqual } from 'crypto'

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    )
  } catch {
    return false
  }
}

// Express middleware
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-magnet-signature']
  const isValid = verifySignature(JSON.stringify(req.body), signature, WEBHOOK_SECRET)

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // Process webhook...
})
```

---

## Success Criteria

1. Events emitted for all content CRUD operations
2. Webhook registration with event filtering
3. Reliable delivery with exponential backoff retries
4. HMAC signature verification
5. Delivery logs with request/response details
6. Test webhook functionality
7. Admin UI for webhook management
8. Automatic cleanup of old delivery logs
