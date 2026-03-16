import type { BaseSchema, Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { StripePayment } from '../schemas/payment.schema'
import { StripeSubscription } from '../schemas/subscription.schema'
import { StripeService } from '../stripe.service'
import type { StripeMetricsResponse } from '../types'

@Injectable()
export class StripeMetricsService {
	constructor(
		@InjectModel(StripePayment)
		private readonly paymentModel: Model<StripePayment>,
		@InjectModel(StripeSubscription)
		private readonly subscriptionModel: Model<StripeSubscription>,
		private readonly stripeService: StripeService,
	) {}

	/**
	 * Get dashboard metrics — hybrid of live Stripe API and local DB data.
	 */
	async getMetrics(): Promise<StripeMetricsResponse> {
		const [mrr, activeSubscriptions, revenueThisMonth, recentPayments] =
			await Promise.all([
				this.calculateMRR(),
				this.countActiveSubscriptions(),
				this.calculateRevenueThisMonth(),
				this.getRecentPayments(),
			])

		const revenueByMonth = await this.getRevenueByMonth()
		const churnRate = await this.calculateChurnRate()

		return {
			mrr,
			revenueThisMonth,
			activeSubscriptions,
			churnRate,
			revenueByMonth,
			recentPayments,
		}
	}

	/**
	 * Calculate MRR from active subscriptions via live Stripe API.
	 */
	private async calculateMRR(): Promise<number> {
		try {
			const subscriptions = await this.stripeService.client.subscriptions.list({
				status: 'active',
				limit: 100,
			})

			let mrr = 0
			for (const sub of subscriptions.data) {
				for (const item of sub.items.data) {
					const amount = item.price?.unit_amount ?? 0
					const interval = item.price?.recurring?.interval
					switch (interval) {
						case 'year':
							mrr += Math.round(amount / 12)
							break
						case 'month':
							mrr += amount
							break
						case 'week':
							mrr += Math.round(amount * 4.33)
							break
						case 'day':
							mrr += Math.round(amount * 30)
							break
					}
				}
			}
			return mrr
		} catch {
			return 0
		}
	}

	private async countActiveSubscriptions(): Promise<number> {
		const subs = await this.subscriptionModel.findMany({
			status: 'active',
		} as Partial<BaseSchema<StripeSubscription>>)
		return subs.length
	}

	private async calculateRevenueThisMonth(): Promise<number> {
		const payments = await this.paymentModel.findMany({
			status: 'succeeded',
		} as Partial<BaseSchema<StripePayment>>)

		const now = new Date()
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

		return payments
			.filter((p) => new Date(p.createdAt) >= startOfMonth)
			.reduce((sum, p) => sum + p.amount, 0)
	}

	private async calculateChurnRate(): Promise<number> {
		const allSubs = await this.subscriptionModel.find()
		if (allSubs.length === 0) return 0

		const canceled = allSubs.filter((s) => s.status === 'canceled')
		return Math.round((canceled.length / allSubs.length) * 100)
	}

	private async getRevenueByMonth(): Promise<
		Array<{ month: string; revenue: number }>
	> {
		const payments = await this.paymentModel.findMany({
			status: 'succeeded',
		} as Partial<BaseSchema<StripePayment>>)

		const monthMap = new Map<string, number>()
		const now = new Date()

		// Initialize last 12 months
		for (let i = 11; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
			monthMap.set(key, 0)
		}

		for (const payment of payments) {
			const d = new Date(payment.createdAt)
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
			if (monthMap.has(key)) {
				monthMap.set(key, (monthMap.get(key) ?? 0) + payment.amount)
			}
		}

		return Array.from(monthMap.entries()).map(([month, revenue]) => ({
			month,
			revenue,
		}))
	}

	private async getRecentPayments(): Promise<
		StripeMetricsResponse['recentPayments']
	> {
		const payments = await this.paymentModel.find()

		return payments
			.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			)
			.slice(0, 10)
			.map((p) => ({
				id: p.id,
				amount: p.amount,
				currency: p.currency,
				status: p.status,
				customerEmail: p.customerId,
				createdAt: p.createdAt.toISOString(),
			}))
	}
}
