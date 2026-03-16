import { Field, Schema } from '@magnet-cms/common'

/**
 * Stripe Payment — records payment history from invoices and charges.
 * Synced from Stripe via webhooks.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class StripePayment {
	/** Stripe PaymentIntent ID (pi_...) or Invoice ID (in_...) */
	@Field.Text({ required: true, unique: true })
	stripePaymentIntentId!: string

	/** Reference to StripeCustomer.stripeCustomerId */
	@Field.Text({ required: true })
	customerId!: string

	/** Payment amount in the smallest currency unit (e.g., cents) */
	@Field.Number({ required: true })
	amount!: number

	/** Three-letter ISO currency code */
	@Field.Text({ required: true })
	currency!: string

	/** Payment status */
	@Field.Select({
		required: true,
		options: [
			{ label: 'Succeeded', value: 'succeeded' },
			{ label: 'Failed', value: 'failed' },
			{ label: 'Refunded', value: 'refunded' },
			{ label: 'Pending', value: 'pending' },
		],
	})
	status!: string

	/** URL for the payment receipt */
	@Field.Text()
	receiptUrl?: string

	/** Stripe Invoice ID if payment is from an invoice */
	@Field.Text()
	invoiceId?: string

	/** When the payment was created */
	@Field.Date({ required: true, default: () => new Date() })
	createdAt!: Date
}
