import { Field, Schema } from '@magnet-cms/common'

/**
 * Polar Subscription — synced from Polar via webhooks.
 * Tracks active, canceled, and past subscriptions.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class PolarSubscription {
	/** Polar Subscription ID */
	@Field.Text({ required: true, unique: true })
	polarSubscriptionId!: string

	/** Reference to PolarCustomer.polarCustomerId */
	@Field.Text({ required: true })
	customerId!: string

	/** Reference to PolarProduct.polarProductId */
	@Field.Text({ required: true })
	productId!: string

	/** Subscription status from Polar */
	@Field.Select({
		required: true,
		options: [
			{ label: 'Active', value: 'active' },
			{ label: 'Canceled', value: 'canceled' },
			{ label: 'Past Due', value: 'past_due' },
			{ label: 'Trialing', value: 'trialing' },
			{ label: 'Incomplete', value: 'incomplete' },
			{ label: 'Unpaid', value: 'unpaid' },
			{ label: 'Revoked', value: 'revoked' },
		],
	})
	status!: string

	/** Subscription amount in smallest currency unit (cents) */
	@Field.Number()
	amount?: number

	/** Three-letter ISO currency code */
	@Field.Text()
	currency?: string

	/** Recurring interval (month, year, week, day) */
	@Field.Text()
	recurringInterval?: string

	/** Start of the current billing period */
	@Field.Date({ required: true })
	currentPeriodStart!: Date

	/** End of the current billing period */
	@Field.Date({ required: true })
	currentPeriodEnd!: Date

	/** Whether the subscription will be canceled at the end of the period */
	@Field.Boolean({ default: false })
	cancelAtPeriodEnd = false

	/** When the subscription started */
	@Field.Date()
	startedAt?: Date

	/** When the subscription ended (null if still active) */
	@Field.Date()
	endedAt?: Date

	/** When the subscription was last synced */
	@Field.Date({ required: true, default: () => new Date() })
	updatedAt!: Date
}
