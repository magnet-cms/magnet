import { Field, Schema } from '@magnet-cms/common'

/**
 * Polar Processed Event — idempotency tracking for webhook events.
 * Stores event IDs to prevent duplicate processing.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class PolarProcessedEvent {
  /** Polar Event ID — unique to prevent reprocessing */
  @Field.Text({ required: true, unique: true })
  polarEventId!: string

  /** Event type (e.g., 'order.paid', 'subscription.updated') */
  @Field.Text({ required: true })
  eventType!: string

  /** When this event was processed */
  @Field.Date({ required: true, default: () => new Date() })
  processedAt!: Date
}
