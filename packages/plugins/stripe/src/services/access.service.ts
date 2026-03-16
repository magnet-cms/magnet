import type { BaseSchema, Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { StripePrice } from '../schemas/price.schema'
import { StripeProduct } from '../schemas/product.schema'
import { StripeService } from '../stripe.service'
import type { SubscriptionAccessResponse } from '../types'
import { StripeCustomerService } from './customer.service'
import { StripeSubscriptionService } from './subscription.service'

@Injectable()
export class StripeAccessService {
	constructor(
		private readonly stripeService: StripeService,
		private readonly customerService: StripeCustomerService,
		private readonly subscriptionService: StripeSubscriptionService,
		@InjectModel(StripePrice)
		private readonly priceModel: Model<StripePrice>,
		@InjectModel(StripeProduct)
		private readonly productModel: Model<StripeProduct>,
	) {}

	/**
	 * Get subscription access info for a user.
	 * Returns subscription status, plan name, and feature flags.
	 */
	async getAccess(userId: string): Promise<SubscriptionAccessResponse> {
		const noAccess: SubscriptionAccessResponse = {
			hasActiveSubscription: false,
			plan: null,
			expiresAt: null,
			features: [],
		}

		// Find customer by user ID
		const customer = await this.customerService.findByUserId(userId)
		if (!customer) {
			return noAccess
		}

		// Find active subscription
		const subscription = await this.subscriptionService.findActiveByCustomerId(
			customer.stripeCustomerId,
		)
		if (!subscription) {
			return noAccess
		}

		// Resolve price → product → plan name
		const price = await this.priceModel.findOne({
			stripePriceId: subscription.priceId,
		} as Partial<BaseSchema<StripePrice>>)

		let planName: string | null = null
		if (price) {
			const product = await this.productModel.findOne({
				stripeProductId: price.productId,
			} as Partial<BaseSchema<StripeProduct>>)
			planName = product?.name ?? null
		}

		// Resolve feature flags from config
		const features = this.resolveFeaturesForPlan(planName)

		return {
			hasActiveSubscription: true,
			plan: planName,
			expiresAt: subscription.currentPeriodEnd,
			features,
		}
	}

	/**
	 * Resolve feature flags for a plan name from plugin config.
	 */
	private resolveFeaturesForPlan(planName: string | null): string[] {
		if (!planName) return []

		const featuresConfig = this.stripeService.pluginConfig.features
		if (!featuresConfig) return []

		// Try exact match first, then case-insensitive
		const normalizedPlan = planName.toLowerCase()
		for (const [key, features] of Object.entries(featuresConfig)) {
			if (key.toLowerCase() === normalizedPlan) {
				return features
			}
		}

		return []
	}
}
