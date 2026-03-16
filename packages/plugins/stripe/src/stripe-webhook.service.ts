import type { BaseSchema, Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { EmailService } from '@magnet-cms/core'
import { Injectable, Logger, Optional } from '@nestjs/common'
import type Stripe from 'stripe'
import { StripePayment } from './schemas/payment.schema'
import { StripeProcessedEvent } from './schemas/processed-event.schema'
import { StripeCustomerService } from './services/customer.service'
import { StripeProductService } from './services/product.service'
import { StripeSubscriptionService } from './services/subscription.service'

/**
 * Stripe Webhook Service
 *
 * Processes webhook events with idempotency checks.
 * Dispatches to sync services by event type.
 */
@Injectable()
export class StripeWebhookService {
	private readonly logger = new Logger(StripeWebhookService.name)

	constructor(
		@InjectModel(StripeProcessedEvent)
		private readonly processedEventModel: Model<StripeProcessedEvent>,
		@InjectModel(StripePayment)
		private readonly paymentModel: Model<StripePayment>,
		private readonly customerService: StripeCustomerService,
		private readonly productService: StripeProductService,
		private readonly subscriptionService: StripeSubscriptionService,
		@Optional()
		private readonly emailService?: EmailService,
	) {}

	/**
	 * Process a verified Stripe event with idempotency.
	 * Returns silently if the event was already processed.
	 */
	async processEvent(event: Stripe.Event): Promise<void> {
		const existing = await this.findProcessedEvent(event.id)
		if (existing) {
			this.logger.log(`Event ${event.id} already processed, skipping`)
			return
		}

		try {
			await this.dispatchEvent(event)
			await this.recordProcessedEvent(event.id, event.type)
		} catch (error) {
			// Don't record — let Stripe retry on next delivery
			this.logger.error(
				`Failed to process event ${event.id} (${event.type}): ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	/**
	 * Dispatch event to the appropriate handler.
	 */
	private async dispatchEvent(event: Stripe.Event): Promise<void> {
		switch (event.type) {
			case 'checkout.session.completed':
				await this.handleCheckoutCompleted(
					event.data.object as Stripe.Checkout.Session,
				)
				break

			case 'customer.created':
			case 'customer.updated':
				await this.customerService.upsertFromStripe(
					event.data.object as Stripe.Customer,
				)
				break

			case 'customer.deleted':
				await this.customerService.deleteByStripeId(
					(event.data.object as Stripe.Customer).id,
				)
				break

			case 'customer.subscription.created':
			case 'customer.subscription.updated':
				await this.subscriptionService.syncSubscription(
					event.data.object as Stripe.Subscription,
				)
				break

			case 'customer.subscription.deleted':
				await this.subscriptionService.deleteByStripeId(
					(event.data.object as Stripe.Subscription).id,
				)
				break

			case 'invoice.paid':
				await this.handleInvoicePaid(event.data.object as Stripe.Invoice)
				break

			case 'invoice.payment_failed':
				await this.handleInvoicePaymentFailed(
					event.data.object as Stripe.Invoice,
				)
				break

			case 'product.created':
			case 'product.updated':
				await this.productService.syncProduct(
					event.data.object as Stripe.Product,
				)
				break

			case 'product.deleted':
				await this.productService.deleteProduct(
					(event.data.object as Stripe.Product).id,
				)
				break

			case 'price.created':
			case 'price.updated':
				await this.productService.syncPrice(event.data.object as Stripe.Price)
				break

			case 'price.deleted':
				await this.productService.deletePrice(
					(event.data.object as Stripe.Price).id,
				)
				break

			default:
				this.logger.log(`Unhandled event type: ${event.type}`)
		}
	}

	// =========================================================================
	// Event Handlers — complex events that touch multiple services
	// =========================================================================

	private async handleCheckoutCompleted(
		session: Stripe.Checkout.Session,
	): Promise<void> {
		this.logger.log(`checkout.session.completed: ${session.id}`)

		// Sync customer if present
		if (session.customer) {
			const customerId =
				typeof session.customer === 'string'
					? session.customer
					: session.customer.id
			this.logger.log(`Checkout customer: ${customerId}`)
		}

		// Record payment if payment_intent is present
		if (session.payment_intent && session.amount_total !== null) {
			const paymentIntentId =
				typeof session.payment_intent === 'string'
					? session.payment_intent
					: session.payment_intent.id
			const customerId =
				typeof session.customer === 'string'
					? session.customer
					: (session.customer?.id ?? '')

			await this.paymentModel.create({
				stripePaymentIntentId: paymentIntentId,
				customerId,
				amount: session.amount_total,
				currency: session.currency ?? 'usd',
				status: 'succeeded',
				createdAt: new Date(),
			} as Partial<BaseSchema<StripePayment>>)
		}
	}

	async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
		this.logger.log(`invoice.paid: ${invoice.id}`)

		const customerId =
			typeof invoice.customer === 'string'
				? invoice.customer
				: (invoice.customer?.id ?? '')

		// Record payment
		if (invoice.payment_intent) {
			const paymentIntentId =
				typeof invoice.payment_intent === 'string'
					? invoice.payment_intent
					: invoice.payment_intent.id

			const existing = await this.paymentModel.findOne({
				stripePaymentIntentId: paymentIntentId,
			} as Partial<BaseSchema<StripePayment>>)

			if (!existing) {
				await this.paymentModel.create({
					stripePaymentIntentId: paymentIntentId,
					customerId,
					amount: invoice.amount_paid,
					currency: invoice.currency,
					status: 'succeeded',
					receiptUrl: invoice.hosted_invoice_url ?? undefined,
					invoiceId: invoice.id ?? undefined,
					createdAt: new Date(),
				} as Partial<BaseSchema<StripePayment>>)
			}
		}

		// Send receipt email
		await this.sendReceiptEmail(invoice)
	}

	async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
		this.logger.log(`invoice.payment_failed: ${invoice.id}`)

		const customerId =
			typeof invoice.customer === 'string'
				? invoice.customer
				: (invoice.customer?.id ?? '')

		if (invoice.payment_intent) {
			const paymentIntentId =
				typeof invoice.payment_intent === 'string'
					? invoice.payment_intent
					: invoice.payment_intent.id

			const existing = await this.paymentModel.findOne({
				stripePaymentIntentId: paymentIntentId,
			} as Partial<BaseSchema<StripePayment>>)

			if (!existing) {
				await this.paymentModel.create({
					stripePaymentIntentId: paymentIntentId,
					customerId,
					amount: invoice.amount_due,
					currency: invoice.currency,
					status: 'failed',
					invoiceId: invoice.id ?? undefined,
					createdAt: new Date(),
				} as Partial<BaseSchema<StripePayment>>)
			}
		}

		// Send failed payment email
		await this.sendPaymentFailedEmail(invoice)
	}

	// =========================================================================
	// Email Helpers
	// =========================================================================

	private async sendReceiptEmail(invoice: Stripe.Invoice): Promise<void> {
		if (!this.emailService) return

		const email =
			typeof invoice.customer_email === 'string' ? invoice.customer_email : null
		if (!email) return

		try {
			await this.emailService.send(email, 'Payment Receipt', 'stripe-receipt', {
				amount: (invoice.amount_paid / 100).toFixed(2),
				currency: invoice.currency.toUpperCase(),
				invoiceUrl: invoice.hosted_invoice_url ?? '',
				date: new Date().toLocaleDateString(),
			})
		} catch (error) {
			this.logger.warn(
				`Failed to send receipt email: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	private async sendPaymentFailedEmail(invoice: Stripe.Invoice): Promise<void> {
		if (!this.emailService) return

		const email =
			typeof invoice.customer_email === 'string' ? invoice.customer_email : null
		if (!email) return

		try {
			await this.emailService.send(
				email,
				'Payment Failed',
				'stripe-payment-failed',
				{
					amount: (invoice.amount_due / 100).toFixed(2),
					currency: invoice.currency.toUpperCase(),
					invoiceUrl: invoice.hosted_invoice_url ?? '',
					date: new Date().toLocaleDateString(),
				},
			)
		} catch (error) {
			this.logger.warn(
				`Failed to send payment failed email: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	// =========================================================================
	// Idempotency Helpers
	// =========================================================================

	private async findProcessedEvent(eventId: string): Promise<boolean> {
		const result = await this.processedEventModel.findOne({
			stripeEventId: eventId,
		} as Partial<StripeProcessedEvent & { id: string }>)
		return result !== null
	}

	private async recordProcessedEvent(
		eventId: string,
		eventType: string,
	): Promise<void> {
		try {
			await this.processedEventModel.create({
				stripeEventId: eventId,
				eventType,
				processedAt: new Date(),
			})
		} catch (error) {
			this.logger.warn(
				`Failed to record processed event ${eventId}: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}
}
