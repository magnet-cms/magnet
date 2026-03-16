import { Field, Schema } from '@magnet-cms/common'

/**
 * Stripe Processed Event — idempotency tracking for webhook events.
 * Stores event IDs to prevent duplicate processing.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class StripeProcessedEvent {
	/** Stripe Event ID (evt_...) — unique to prevent reprocessing */
	@Field.Text({ required: true, unique: true })
	stripeEventId!: string

	/** Event type (e.g., 'invoice.paid', 'customer.subscription.updated') */
	@Field.Text({ required: true })
	eventType!: string

	/** When this event was processed */
	@Field.Date({ required: true, default: () => new Date() })
	processedAt!: Date
}
