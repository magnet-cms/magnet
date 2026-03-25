import { Badge, DataTable, type DataTableColumn } from '@magnet-cms/ui/components'
import { ExternalLink } from 'lucide-react'

interface SentryIssue {
  id: string
  shortId: string
  title: string
  status: string
  count: string
  lastSeen: string
  permalink: string
}

interface RecentIssuesProps {
  issues: SentryIssue[]
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
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
        <span className="font-medium truncate max-w-[300px]">{row.original.title}</span>
        <a
          href={row.original.permalink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
        </a>
      </div>
    ),
  },
  {
    type: 'custom',
    header: 'Status',
    cell: (row) => (
      <Badge variant={getStatusVariant(row.original.status)}>{row.original.status}</Badge>
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
      <span className="text-muted-foreground">{formatRelativeTime(value as string)}</span>
    ),
  },
]

export function RecentIssues({ issues }: RecentIssuesProps) {
  if (issues.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No recent issues</p>
  }

  return <DataTable columns={columns} data={issues} />
}
