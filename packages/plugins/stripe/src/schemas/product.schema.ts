import { Field, Prop, Schema } from '@magnet-cms/common'

/**
 * Stripe Product — synced from Stripe via webhooks.
 * Represents a product available for purchase.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class StripeProduct {
	/** Stripe Product ID (prod_...) */
	@Field.Text({ required: true, unique: true })
	stripeProductId!: string

	/** Product name */
	@Field.Text({ required: true })
	name!: string

	/** Product description */
	@Field.Text()
	description?: string

	/** Whether the product is currently active in Stripe */
	@Field.Boolean({ default: true })
	active = true

	/** Arbitrary metadata from Stripe */
	@Prop({ type: Object })
	metadata?: Record<string, string>

	/** Product image URLs */
	@Prop({ type: [String] })
	images?: string[]

	/** When the product was last synced */
	@Field.Date({ required: true, default: () => new Date() })
	updatedAt!: Date
}
