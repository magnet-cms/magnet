import { Field, Schema } from '@magnet-cms/common'

/**
 * Polar Order — synced from Polar via webhooks.
 * Represents a completed payment / transaction.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class PolarOrder {
	/** Polar Order ID */
	@Field.Text({ required: true, unique: true })
	polarOrderId!: string

	/** Reference to PolarCustomer.polarCustomerId */
	@Field.Text({ required: true })
	customerId!: string

	/** Reference to PolarProduct.polarProductId */
	@Field.Text({ required: true })
	productId!: string

	/** Reference to PolarSubscription.polarSubscriptionId (nullable for one-time purchases) */
	@Field.Text()
	subscriptionId?: string

	/** Order status */
	@Field.Select({
		required: true,
		options: [
			{ label: 'Paid', value: 'paid' },
			{ label: 'Refunded', value: 'refunded' },
			{ label: 'Pending', value: 'pending' },
		],
	})
	status!: string

	/** Total order amount in smallest currency unit (cents) */
	@Field.Number({ required: true })
	totalAmount!: number

	/** Three-letter ISO currency code */
	@Field.Text({ required: true })
	currency!: string

	/** Reason for billing (purchase, subscription_create, subscription_cycle, etc.) */
	@Field.Text()
	billingReason?: string

	/** When the order was created */
	@Field.Date({ required: true, default: () => new Date() })
	createdAt!: Date
}
