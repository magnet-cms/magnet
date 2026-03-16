import type { BaseSchema, Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { Injectable, Logger } from '@nestjs/common'
import { RFCDate } from '@polar-sh/sdk/types/rfcdate'
import { PolarService } from '../polar.service'
import { PolarOrder } from '../schemas/order.schema'
import { PolarSubscription } from '../schemas/subscription.schema'
import type { PolarMetricsResponse } from '../types'

@Injectable()
export class PolarMetricsService {
	private readonly logger = new Logger(PolarMetricsService.name)

	constructor(
		@InjectModel(PolarOrder)
		private readonly orderModel: Model<PolarOrder>,
		@InjectModel(PolarSubscription)
		private readonly subscriptionModel: Model<PolarSubscription>,
		private readonly polarService: PolarService,
	) {}

	/**
	 * Get dashboard metrics — hybrid of live Polar API and local DB data.
	 */
	async getMetrics(): Promise<PolarMetricsResponse> {
		try {
			return await this.getMetricsFromApi()
		} catch (error) {
			this.logger.warn(
				`Failed to fetch metrics from Polar API, falling back to local DB: ${error instanceof Error ? error.message : String(error)}`,
			)
			return this.getMetricsFromDb()
		}
	}

	/**
	 * Fetch metrics from Polar's analytics API.
	 */
	private async getMetricsFromApi(): Promise<PolarMetricsResponse> {
		const now = new Date()
		const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)

		const response = await this.polarService.client.metrics.get({
			startDate: new RFCDate(startDate),
			endDate: new RFCDate(now),
			interval: 'month',
		})

		// Extract MRR from the latest period
		const periods = response.periods
		const latestPeriod = periods[periods.length - 1]
		const mrr = Number(latestPeriod?.monthlyRecurringRevenue ?? 0)

		// Revenue this month from latest period
		const revenueThisMonth = Number(latestPeriod?.revenue ?? 0)

		// Active subscriptions from latest period
		const activeSubscriptions = Number(latestPeriod?.activeSubscriptions ?? 0)

		// Churn rate: churned / (active + churned) * 100
		const churned = Number(latestPeriod?.churnedSubscriptions ?? 0)
		const churnRate =
			activeSubscriptions + churned > 0
				? Math.round((churned / (activeSubscriptions + churned)) * 100)
				: 0

		// Revenue by month from all periods
		const revenueByMonth = periods.map((period) => {
			const d = period.timestamp
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
			return { month: key, revenue: Number(period.revenue ?? 0) }
		})

		// Recent orders from local DB
		const recentOrders = await this.getRecentOrders()

		return {
			mrr,
			revenueThisMonth,
			activeSubscriptions,
			churnRate,
			revenueByMonth,
			recentOrders,
		}
	}

	/**
	 * Fall back to local DB computation if API call fails.
	 */
	private async getMetricsFromDb(): Promise<PolarMetricsResponse> {
		const [activeSubscriptions, revenueThisMonth, recentOrders] =
			await Promise.all([
				this.countActiveSubscriptions(),
				this.calculateRevenueThisMonth(),
				this.getRecentOrders(),
			])

		const churnRate = await this.calculateChurnRate()
		const revenueByMonth = await this.getRevenueByMonth()

		return {
			mrr: 0, // Cannot calculate MRR without API
			revenueThisMonth,
			activeSubscriptions,
			churnRate,
			revenueByMonth,
			recentOrders,
		}
	}

	private async countActiveSubscriptions(): Promise<number> {
		const subs = await this.subscriptionModel.findMany({
			status: 'active',
		} as Partial<BaseSchema<PolarSubscription>>)
		return subs.length
	}

	private async calculateRevenueThisMonth(): Promise<number> {
		const orders = await this.orderModel.findMany({
			status: 'paid',
		} as Partial<BaseSchema<PolarOrder>>)

		const now = new Date()
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

		return orders
			.filter((o) => new Date(o.createdAt) >= startOfMonth)
			.reduce((sum, o) => sum + o.totalAmount, 0)
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
		const orders = await this.orderModel.findMany({
			status: 'paid',
		} as Partial<BaseSchema<PolarOrder>>)

		const monthMap = new Map<string, number>()
		const now = new Date()

		// Initialize last 12 months
		for (let i = 11; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
			monthMap.set(key, 0)
		}

		for (const order of orders) {
			const d = new Date(order.createdAt)
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
			if (monthMap.has(key)) {
				monthMap.set(key, (monthMap.get(key) ?? 0) + order.totalAmount)
			}
		}

		return Array.from(monthMap.entries()).map(([month, revenue]) => ({
			month,
			revenue,
		}))
	}

	private async getRecentOrders(): Promise<
		PolarMetricsResponse['recentOrders']
	> {
		const orders = await this.orderModel.find()

		return orders
			.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			)
			.slice(0, 10)
			.map((o) => ({
				id: o.id,
				totalAmount: o.totalAmount,
				currency: o.currency,
				status: o.status,
				customerEmail: o.customerId,
				createdAt: o.createdAt.toISOString(),
			}))
	}
}
