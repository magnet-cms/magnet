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
import { PolarService } from './polar.service'
import { PolarOrder } from './schemas/order.schema'
import { PolarAccessService } from './services/access.service'
import { PolarBenefitService } from './services/benefit.service'
import { PolarCheckoutService } from './services/checkout.service'
import { PolarCustomerService } from './services/customer.service'
import { PolarMetricsService } from './services/metrics.service'
import { PolarPortalService } from './services/portal.service'
import { PolarProductService } from './services/product.service'
import { PolarSubscriptionService } from './services/subscription.service'
import type {
	CreateCheckoutDto,
	CreatePortalDto,
	PolarMetricsResponse,
	SessionResponse,
	SubscriptionAccessResponse,
} from './types'

/**
 * Polar API Controller
 *
 * Public endpoints for checkout, portal, products, and subscriptions.
 * Admin endpoints for managing customers, subscriptions, products, orders, and benefits.
 */
@Controller('polar')
export class PolarApiController {
	constructor(
		private readonly accessService: PolarAccessService,
		private readonly benefitService: PolarBenefitService,
		private readonly checkoutService: PolarCheckoutService,
		private readonly customerService: PolarCustomerService,
		private readonly metricsService: PolarMetricsService,
		@InjectModel(PolarOrder)
		private readonly orderModel: Model<PolarOrder>,
		private readonly portalService: PolarPortalService,
		private readonly productService: PolarProductService,
		private readonly polarService: PolarService,
		private readonly subscriptionService: PolarSubscriptionService,
	) {}

	// =========================================================================
	// Public Endpoints
	// =========================================================================

	/**
	 * Create a Polar Checkout session.
	 * POST /polar/checkout
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
	 * Create a Polar Customer Portal session.
	 * POST /polar/portal
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
	 * List active products.
	 * GET /polar/products
	 */
	@Get('products')
	async listProducts() {
		return this.productService.findActiveProducts()
	}

	/**
	 * Get a user's active subscription.
	 * GET /polar/subscription/:userId
	 */
	@Get('subscription/:userId')
	async getUserSubscription(@Param('userId') userId: string) {
		const customer = await this.customerService.findByUserId(userId)
		if (!customer) {
			return { subscription: null }
		}

		const subscription = await this.subscriptionService.findActiveByCustomerId(
			customer.polarCustomerId,
		)
		return { subscription }
	}

	/**
	 * Get subscription access info and feature flags for a user.
	 * GET /polar/access/:userId
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
	 * Get dashboard metrics.
	 * GET /polar/admin/metrics
	 */
	@Get('admin/metrics')
	@RestrictedRoute()
	async getMetrics(): Promise<PolarMetricsResponse> {
		return this.metricsService.getMetrics()
	}

	/**
	 * List all customers (admin).
	 * GET /polar/admin/customers
	 */
	@Get('admin/customers')
	@RestrictedRoute()
	async listCustomers() {
		return this.customerService.findAll()
	}

	/**
	 * List all subscriptions (admin).
	 * GET /polar/admin/subscriptions
	 */
	@Get('admin/subscriptions')
	@RestrictedRoute()
	async listSubscriptions() {
		return this.subscriptionService.findAll()
	}

	/**
	 * Cancel (revoke) a subscription (admin).
	 * POST /polar/admin/subscriptions/:id/cancel
	 */
	@Post('admin/subscriptions/:id/cancel')
	@RestrictedRoute()
	async cancelSubscription(@Param('id') polarSubscriptionId: string) {
		await this.subscriptionService.revoke(polarSubscriptionId)
		return { canceled: true }
	}

	/**
	 * List all products (admin).
	 * GET /polar/admin/products
	 */
	@Get('admin/products')
	@RestrictedRoute()
	async listAllProducts() {
		return this.productService.findAllProducts()
	}

	/**
	 * Sync products from Polar API (admin).
	 * POST /polar/admin/sync-products
	 */
	@Post('admin/sync-products')
	@RestrictedRoute()
	async syncProducts() {
		let productCount = 0
		for await (const page of await this.polarService.client.products.list({})) {
			for (const product of page.result.items) {
				await this.productService.syncProduct({
					id: product.id,
					name: product.name,
					description: product.description ?? undefined,
					isRecurring: product.isRecurring,
					isArchived: product.isArchived,
					organizationId: product.organizationId,
					metadata: product.metadata as Record<
						string,
						string | number | boolean
					>,
				})
				productCount++
			}
		}

		return { synced: true, products: productCount }
	}

	/**
	 * List all orders (admin).
	 * GET /polar/admin/orders
	 */
	@Get('admin/orders')
	@RestrictedRoute()
	async listOrders() {
		return this.orderModel.find()
	}

	/**
	 * List all benefits (admin).
	 * GET /polar/admin/benefits
	 */
	@Get('admin/benefits')
	@RestrictedRoute()
	async listBenefits() {
		return this.benefitService.findAll()
	}

	/**
	 * List all benefit grants (admin).
	 * GET /polar/admin/benefit-grants
	 */
	@Get('admin/benefit-grants')
	@RestrictedRoute()
	async listBenefitGrants() {
		return this.benefitService.findGrantsAll()
	}
}
