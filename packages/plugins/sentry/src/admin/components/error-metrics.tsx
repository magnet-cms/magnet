import { Card } from '@magnet-cms/ui/components'
import { AlertTriangle, BarChart3, Bug } from 'lucide-react'

interface MetricCardProps {
	title: string
	value: string | number
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

interface ErrorMetricsProps {
	totalErrors: number
	unresolvedIssues: number
	errorsLast24h: number
}

export function ErrorMetrics({
	totalErrors,
	unresolvedIssues,
	errorsLast24h,
}: ErrorMetricsProps) {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<MetricCard
				title="Unresolved Issues"
				value={unresolvedIssues}
				icon={<AlertTriangle className="h-5 w-5" />}
			/>
			<MetricCard
				title="Errors (Last 24h)"
				value={errorsLast24h}
				icon={<Bug className="h-5 w-5" />}
			/>
			<MetricCard
				title="Total Errors"
				value={totalErrors}
				icon={<BarChart3 className="h-5 w-5" />}
			/>
		</div>
	)
}
