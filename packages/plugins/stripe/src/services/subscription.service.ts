import type { BaseSchema, Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import type Stripe from 'stripe'
import { StripeSubscription } from '../schemas/subscription.schema'
import { StripeService } from '../stripe.service'

@Injectable()
export class StripeSubscriptionService {
	constructor(
		@InjectModel(StripeSubscription)
		private readonly subscriptionModel: Model<StripeSubscription>,
		private readonly stripeService: StripeService,
	) {}

	/**
	 * Upsert a subscription from a Stripe Subscription object.
	 */
	async syncSubscription(
		stripeSub: Stripe.Subscription,
	): Promise<BaseSchema<StripeSubscription>> {
		const customerId =
			typeof stripeSub.customer === 'string'
				? stripeSub.customer
				: stripeSub.customer.id

		const priceId = stripeSub.items.data[0]?.price?.id ?? ''

		const data: Partial<StripeSubscription> = {
			stripeSubscriptionId: stripeSub.id,
			customerId,
			priceId,
			status: stripeSub.status,
			currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
			currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
			cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
			trialEnd: stripeSub.trial_end
				? new Date(stripeSub.trial_end * 1000)
				: undefined,
			updatedAt: new Date(),
		}

		const existing = await this.subscriptionModel.findOne({
			stripeSubscriptionId: stripeSub.id,
		} as Partial<BaseSchema<StripeSubscription>>)

		if (existing) {
			return this.subscriptionModel.update(
				{ stripeSubscriptionId: stripeSub.id } as Partial<
					BaseSchema<StripeSubscription>
				>,
				data as Partial<BaseSchema<StripeSubscription>>,
			)
		}

		return this.subscriptionModel.create(
			data as Partial<BaseSchema<StripeSubscription>>,
		)
	}

	/**
	 * Delete a subscription record by Stripe Subscription ID.
	 */
	async deleteByStripeId(stripeSubscriptionId: string): Promise<void> {
		await this.subscriptionModel.delete({
			stripeSubscriptionId,
		} as Partial<BaseSchema<StripeSubscription>>)
	}

	/**
	 * Find active subscription for a customer.
	 */
	async findActiveByCustomerId(
		customerId: string,
	): Promise<BaseSchema<StripeSubscription> | null> {
		return this.subscriptionModel.findOne({
			customerId,
			status: 'active',
		} as Partial<BaseSchema<StripeSubscription>>)
	}

	/**
	 * List all subscriptions.
	 */
	async findAll(): Promise<BaseSchema<StripeSubscription>[]> {
		return this.subscriptionModel.find()
	}

	/**
	 * Cancel a subscription via the Stripe API.
	 */
	async cancel(stripeSubscriptionId: string): Promise<void> {
		await this.stripeService.client.subscriptions.cancel(stripeSubscriptionId)
	}
}
