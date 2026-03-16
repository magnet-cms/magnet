import type { Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { RestrictedRoute } from '@magnet-cms/core'
import {
	Body,
	Controller,
	Get,
	HttpException,
	HttpStatus,
	Param,
	Post,
} from '@nestjs/common'
import { StripePayment } from './schemas/payment.schema'
import { StripeAccessService } from './services/access.service'
import { StripeCheckoutService } from './services/checkout.service'
import { StripeCustomerService } from './services/customer.service'
import { StripeMetricsService } from './services/metrics.service'
import { StripePortalService } from './services/portal.service'
import { StripeProductService } from './services/product.service'
import { StripeSubscriptionService } from './services/subscription.service'
import { StripeService } from './stripe.service'
import type {
	CreateCheckoutDto,
	CreatePortalDto,
	SessionResponse,
	StripeMetricsResponse,
	SubscriptionAccessResponse,
} from './types'

/**
 * Stripe API Controller
 *
 * Public endpoints for checkout, portal, products, and subscriptions.
 * Admin endpoints added in Tasks 8-10.
 */
@Controller('stripe')
export class StripeApiController {
	constructor(
		private readonly accessService: StripeAccessService,
		private readonly checkoutService: StripeCheckoutService,
		private readonly customerService: StripeCustomerService,
		private readonly metricsService: StripeMetricsService,
		@InjectModel(StripePayment)
		private readonly paymentModel: Model<StripePayment>,
		private readonly portalService: StripePortalService,
		private readonly productService: StripeProductService,
		private readonly stripeService: StripeService,
		private readonly subscriptionService: StripeSubscriptionService,
	) {}

	/**
	 * Create a Stripe Checkout session.
	 * POST /stripe/checkout
	 */
	@Post('checkout')
	async createCheckout(
		@Body() dto: CreateCheckoutDto,
	): Promise<SessionResponse> {
		try {
			return await this.checkoutService.createCheckoutSession(dto)
		} catch (error) {
			if (error instanceof HttpException) throw error
			throw new HttpException(
				error instanceof Error
					? error.message
					: 'Failed to create checkout session',
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}
	}

	/**
	 * Create a Stripe Customer Portal session.
	 * POST /stripe/portal
	 */
	@Post('portal')
	async createPortal(@Body() dto: CreatePortalDto): Promise<SessionResponse> {
		try {
			return await this.portalService.createPortalSession(dto)
		} catch (error) {
			if (error instanceof HttpException) throw error
			throw new HttpException(
				error instanceof Error
					? error.message
					: 'Failed to create portal session',
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}
	}

	/**
	 * List active products with their prices.
	 * GET /stripe/products
	 */
	@Get('products')
	async listProducts() {
		return this.productService.findActiveProductsWithPrices()
	}

	/**
	 * Get a user's active subscription.
	 * GET /stripe/subscription/:userId
	 */
	@Get('subscription/:userId')
	async getUserSubscription(@Param('userId') userId: string) {
		const customer = await this.customerService.findByUserId(userId)
		if (!customer) {
			return { subscription: null }
		}

		const subscription = await this.subscriptionService.findActiveByCustomerId(
			customer.stripeCustomerId,
		)
		return { subscription }
	}

	/**
	 * Get subscription access info and feature flags for a user.
	 * GET /stripe/access/:userId
	 */
	@Get('access/:userId')
	@RestrictedRoute()
	async getAccess(
		@Param('userId') userId: string,
	): Promise<SubscriptionAccessResponse> {
		return this.accessService.getAccess(userId)
	}

	// =========================================================================
	// Admin Endpoints
	// =========================================================================

	/**
	 * Get dashboard metrics (MRR, revenue, subscriptions).
	 * GET /stripe/admin/metrics
	 */
	@Get('admin/metrics')
	@RestrictedRoute()
	async getMetrics(): Promise<StripeMetricsResponse> {
		return this.metricsService.getMetrics()
	}

	/**
	 * List all customers (admin).
	 * GET /stripe/admin/customers
	 */
	@Get('admin/customers')
	@RestrictedRoute()
	async listCustomers() {
		return this.customerService.findAll()
	}

	/**
	 * List all subscriptions (admin).
	 * GET /stripe/admin/subscriptions
	 */
	@Get('admin/subscriptions')
	@RestrictedRoute()
	async listSubscriptions() {
		return this.subscriptionService.findAll()
	}

	/**
	 * Cancel a subscription (admin).
	 * POST /stripe/admin/subscriptions/:id/cancel
	 */
	@Post('admin/subscriptions/:id/cancel')
	@RestrictedRoute()
	async cancelSubscription(@Param('id') stripeSubscriptionId: string) {
		await this.subscriptionService.cancel(stripeSubscriptionId)
		return { canceled: true }
	}

	/**
	 * List all products (admin).
	 * GET /stripe/admin/products
	 */
	@Get('admin/products')
	@RestrictedRoute()
	async listAllProducts() {
		return this.productService.findAllProducts()
	}

	/**
	 * Sync products and prices from Stripe (admin).
	 * POST /stripe/admin/sync-products
	 */
	@Post('admin/sync-products')
	@RestrictedRoute()
	async syncProducts() {
		let productCount = 0
		for await (const product of this.stripeService.client.products.list({
			active: true,
		})) {
			await this.productService.syncProduct(product)
			productCount++
		}

		let priceCount = 0
		for await (const price of this.stripeService.client.prices.list({
			active: true,
		})) {
			await this.productService.syncPrice(price)
			priceCount++
		}

		return {
			synced: true,
			products: productCount,
			prices: priceCount,
		}
	}

	/**
	 * List all payments (admin).
	 * GET /stripe/admin/payments
	 */
	@Get('admin/payments')
	@RestrictedRoute()
	async listPayments() {
		return this.paymentModel.find()
	}

	/**
	 * Refund a payment (admin).
	 * POST /stripe/admin/payments/:id/refund
	 */
	@Post('admin/payments/:id/refund')
	@RestrictedRoute()
	async refundPayment(@Param('id') paymentIntentId: string) {
		try {
			await this.stripeService.client.refunds.create({
				payment_intent: paymentIntentId,
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Refund failed'
			throw new HttpException(message, HttpStatus.BAD_REQUEST)
		}

		// Update local record
		await this.paymentModel.update(
			{
				stripePaymentIntentId: paymentIntentId,
			} as Partial<
				import('@magnet-cms/common').BaseSchema<
					import('./schemas/payment.schema').StripePayment
				>
			>,
			{
				status: 'refunded',
			} as Partial<
				import('@magnet-cms/common').BaseSchema<
					import('./schemas/payment.schema').StripePayment
				>
			>,
		)

		return { refunded: true }
	}
}
