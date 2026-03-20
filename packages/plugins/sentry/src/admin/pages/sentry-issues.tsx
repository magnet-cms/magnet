import { PageContent, PageHeader, useAdapter } from '@magnet-cms/admin'
import {
	Badge,
	DataTable,
	type DataTableColumn,
	Skeleton,
} from '@magnet-cms/ui/components'
import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'

interface SentryIssue {
	id: string
	shortId: string
	title: string
	status: string
	count: string
	lastSeen: string
	permalink: string
}

function getStatusVariant(
	status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
	switch (status) {
		case 'resolved':
			return 'secondary'
		case 'ignored':
			return 'outline'
		default:
			return 'destructive'
	}
}

function formatRelativeTime(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime()
	const minutes = Math.floor(diff / 60_000)
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	return `${Math.floor(hours / 24)}d ago`
}

const columns: DataTableColumn<SentryIssue>[] = [
	{
		type: 'custom',
		header: 'Title',
		cell: (row) => (
			<div className="flex items-center gap-2">
				<div>
					<p className="font-medium">{row.original.title}</p>
					<p className="text-xs text-muted-foreground font-mono">
						{row.original.shortId}
					</p>
				</div>
				<a
					href={row.original.permalink}
					target="_blank"
					rel="noopener noreferrer"
					onClick={(e) => e.stopPropagation()}
					className="ml-auto shrink-0"
				>
					<ExternalLink className="h-4 w-4 text-muted-foreground" />
				</a>
			</div>
		),
	},
	{
		type: 'custom',
		header: 'Status',
		cell: (row) => (
			<Badge variant={getStatusVariant(row.original.status)}>
				{row.original.status}
			</Badge>
		),
	},
	{
		type: 'text',
		header: 'Events',
		accessorKey: 'count',
	},
	{
		type: 'text',
		header: 'Last Seen',
		accessorKey: 'lastSeen',
		format: (value) => (
			<span className="text-muted-foreground">
				{formatRelativeTime(value as string)}
			</span>
		),
	},
]

const SentryIssues = () => {
	const adapter = useAdapter()
	const [issues, setIssues] = useState<SentryIssue[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		async function fetchIssues() {
			try {
				const data = await adapter.request<SentryIssue[]>(
					'/sentry/admin/issues',
				)
				setIssues(data)
			} catch (error) {
				console.error('[Sentry] Failed to fetch issues:', error)
			} finally {
				setLoading(false)
			}
		}
		fetchIssues()
	}, [adapter])

	return (
		<>
			<PageHeader title="Sentry Issues" />
			<PageContent>
				{loading ? (
					<div className="space-y-2 p-6">
						{[1, 2, 3, 4, 5].map((i) => (
							<Skeleton key={i} className="h-12" />
						))}
					</div>
				) : issues.length === 0 ? (
					<div className="p-6 text-center text-sm text-muted-foreground">
						No issues found
					</div>
				) : (
					<div className="p-6">
						<DataTable columns={columns} data={issues} />
					</div>
				)}
			</PageContent>
		</>
	)
}

export default SentryIssues
