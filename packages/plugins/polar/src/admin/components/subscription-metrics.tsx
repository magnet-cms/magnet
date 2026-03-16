import { Card } from '@magnet-cms/ui/components'
import { CreditCard, DollarSign, TrendingDown, Users } from 'lucide-react'

interface MetricCardProps {
	title: string
	value: string
	icon: React.ReactNode
}

function MetricCard({ title, value, icon }: MetricCardProps) {
	return (
		<Card className="p-6">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-muted-foreground">{title}</p>
					<p className="text-2xl font-bold mt-1">{value}</p>
				</div>
				<div className="text-muted-foreground">{icon}</div>
			</div>
		</Card>
	)
}

interface SubscriptionMetricsProps {
	mrr: number
	revenueThisMonth: number
	activeSubscriptions: number
	churnRate: number
}

function formatCurrency(cents: number): string {
	return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export function SubscriptionMetrics({
	mrr,
	revenueThisMonth,
	activeSubscriptions,
	churnRate,
}: SubscriptionMetricsProps) {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<MetricCard
				title="Monthly Recurring Revenue"
				value={formatCurrency(mrr)}
				icon={<DollarSign className="h-5 w-5" />}
			/>
			<MetricCard
				title="Revenue This Month"
				value={formatCurrency(revenueThisMonth)}
				icon={<CreditCard className="h-5 w-5" />}
			/>
			<MetricCard
				title="Active Subscriptions"
				value={String(activeSubscriptions)}
				icon={<Users className="h-5 w-5" />}
			/>
			<MetricCard
				title="Churn Rate"
				value={`${churnRate}%`}
				icon={<TrendingDown className="h-5 w-5" />}
			/>
		</div>
	)
}
