import { PageContent, PageHeader, useAdapter } from '@magnet-cms/admin'
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Card,
	Skeleton,
} from '@magnet-cms/ui/components'
import { useEffect, useState } from 'react'
import { ErrorMetrics } from '../components/error-metrics'
import { RecentIssues } from '../components/recent-issues'

interface SentryStats {
	isConfigured: boolean
	apiError?: string
	totalErrors: number
	unresolvedIssues: number
	errorsLast24h: number
}

interface SentryIssue {
	id: string
	shortId: string
	title: string
	status: string
	count: string
	lastSeen: string
	permalink: string
}

function DashboardSkeleton() {
	return (
		<div className="space-y-6 p-6">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				{['unresolved', '24h', 'total'].map((id) => (
					<Skeleton key={id} className="h-24" />
				))}
			</div>
			<Skeleton className="h-[200px]" />
		</div>
	)
}

function SetupCard() {
	return (
		<Card className="p-6">
			<h3 className="text-lg font-semibold mb-2">Sentry API Not Configured</h3>
			<p className="text-sm text-muted-foreground mb-4">
				To enable the error dashboard, add the following environment variables:
			</p>
			<ul className="text-sm font-mono space-y-1 bg-muted p-3 rounded-md">
				<li>SENTRY_AUTH_TOKEN=your-auth-token</li>
				<li>SENTRY_ORG=your-org-slug</li>
				<li>SENTRY_PROJECT=your-project-slug</li>
			</ul>
		</Card>
	)
}

const SentryDashboard = () => {
	const adapter = useAdapter()
	const [stats, setStats] = useState<SentryStats | null>(null)
	const [issues, setIssues] = useState<SentryIssue[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		async function fetchData() {
			try {
				const [statsData, issuesData] = await Promise.all([
					adapter.request<SentryStats>('/sentry/admin/stats'),
					adapter.request<SentryIssue[]>('/sentry/admin/issues'),
				])
				setStats(statsData)
				setIssues(issuesData.slice(0, 5))
			} catch (error) {
				console.error('[Sentry] Failed to fetch dashboard data:', error)
			} finally {
				setLoading(false)
			}
		}
		fetchData()
	}, [adapter])

	return (
		<>
			<PageHeader title="Sentry Dashboard" />
			<PageContent>
				{loading || !stats ? (
					<DashboardSkeleton />
				) : !stats.isConfigured ? (
					<div className="p-6">
						<SetupCard />
					</div>
				) : (
					<div className="space-y-6 p-6">
						{stats.apiError ? (
							<Alert variant="destructive">
								<AlertTitle>Could not load Sentry data</AlertTitle>
								<AlertDescription className="text-sm whitespace-pre-wrap">
									{stats.apiError}
								</AlertDescription>
							</Alert>
						) : null}
						<ErrorMetrics
							totalErrors={stats.totalErrors}
							unresolvedIssues={stats.unresolvedIssues}
							errorsLast24h={stats.errorsLast24h}
						/>
						<div>
							<h3 className="text-lg font-semibold mb-4">Recent Issues</h3>
							<RecentIssues issues={issues} />
						</div>
					</div>
				)}
			</PageContent>
		</>
	)
}

export default SentryDashboard
