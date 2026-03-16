import { Field, Schema } from '@magnet-cms/common'

/**
 * Stripe Subscription — synced from Stripe via webhooks.
 * Tracks active, canceled, and past subscriptions.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class StripeSubscription {
	/** Stripe Subscription ID (sub_...) */
	@Field.Text({ required: true, unique: true })
	stripeSubscriptionId!: string

	/** Reference to StripeCustomer.stripeCustomerId */
	@Field.Text({ required: true })
	customerId!: string

	/** Reference to StripePrice.stripePriceId */
	@Field.Text({ required: true })
	priceId!: string

	/** Subscription status from Stripe */
	@Field.Select({
		required: true,
		options: [
			{ label: 'Active', value: 'active' },
			{ label: 'Past Due', value: 'past_due' },
			{ label: 'Canceled', value: 'canceled' },
			{ label: 'Incomplete', value: 'incomplete' },
			{ label: 'Incomplete Expired', value: 'incomplete_expired' },
			{ label: 'Trialing', value: 'trialing' },
			{ label: 'Unpaid', value: 'unpaid' },
			{ label: 'Paused', value: 'paused' },
		],
	})
	status!: string

	/** Start of the current billing period */
	@Field.Date({ required: true })
	currentPeriodStart!: Date

	/** End of the current billing period */
	@Field.Date({ required: true })
	currentPeriodEnd!: Date

	/** Whether the subscription will be canceled at the end of the period */
	@Field.Boolean({ default: false })
	cancelAtPeriodEnd = false

	/** When the trial ends (null if no trial) */
	@Field.Date()
	trialEnd?: Date

	/** When the subscription was last synced */
	@Field.Date({ required: true, default: () => new Date() })
	updatedAt!: Date
}
