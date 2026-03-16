import type { BaseSchema, Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { PolarService } from '../polar.service'
import { PolarSubscription } from '../schemas/subscription.schema'

@Injectable()
export class PolarSubscriptionService {
	constructor(
		@InjectModel(PolarSubscription)
		private readonly subscriptionModel: Model<PolarSubscription>,
		private readonly polarService: PolarService,
	) {}

	/**
	 * Upsert a subscription from a webhook subscription payload.
	 */
	async syncSubscription(data: {
		id: string
		customerId: string
		productId: string
		status: string
		amount?: number
		currency?: string
		recurringInterval?: string
		currentPeriodStart: Date
		currentPeriodEnd: Date
		cancelAtPeriodEnd: boolean
		startedAt?: Date | null
		endedAt?: Date | null
	}): Promise<BaseSchema<PolarSubscription>> {
		const subData: Partial<PolarSubscription> = {
			polarSubscriptionId: data.id,
			customerId: data.customerId,
			productId: data.productId,
			status: data.status,
			amount: data.amount,
			currency: data.currency,
			recurringInterval: data.recurringInterval,
			currentPeriodStart: data.currentPeriodStart,
			currentPeriodEnd: data.currentPeriodEnd,
			cancelAtPeriodEnd: data.cancelAtPeriodEnd,
			startedAt: data.startedAt ?? undefined,
			endedAt: data.endedAt ?? undefined,
			updatedAt: new Date(),
		}

		const existing = await this.subscriptionModel.findOne({
			polarSubscriptionId: data.id,
		} as Partial<BaseSchema<PolarSubscription>>)

		if (existing) {
			return this.subscriptionModel.update(
				{ polarSubscriptionId: data.id } as Partial<
					BaseSchema<PolarSubscription>
				>,
				subData as Partial<BaseSchema<PolarSubscription>>,
			)
		}

		return this.subscriptionModel.create(
			subData as Partial<BaseSchema<PolarSubscription>>,
		)
	}

	/**
	 * Delete a subscription record by Polar Subscription ID.
	 */
	async deleteByPolarId(polarSubscriptionId: string): Promise<void> {
		await this.subscriptionModel.delete({
			polarSubscriptionId,
		} as Partial<BaseSchema<PolarSubscription>>)
	}

	/**
	 * Find active subscription for a customer.
	 */
	async findActiveByCustomerId(
		customerId: string,
	): Promise<BaseSchema<PolarSubscription> | null> {
		return this.subscriptionModel.findOne({
			customerId,
			status: 'active',
		} as Partial<BaseSchema<PolarSubscription>>)
	}

	/**
	 * List all subscriptions.
	 */
	async findAll(): Promise<BaseSchema<PolarSubscription>[]> {
		return this.subscriptionModel.find()
	}

	/**
	 * Revoke (cancel immediately) a subscription via Polar SDK.
	 */
	async revoke(polarSubscriptionId: string): Promise<void> {
		await this.polarService.client.subscriptions.revoke({
			id: polarSubscriptionId,
		})
	}
}
