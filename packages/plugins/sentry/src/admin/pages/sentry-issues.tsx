import { PageHeader, useAdapter } from '@magnet-cms/admin'
import {
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
  type DataTableRenderContext,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@magnet-cms/ui/components'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ALL_PROJECTS, useProjectFilter } from '../hooks/use-project-filter'

interface SentryIssue {
  id: string
  shortId: string
  title: string
  status: string
  count: string
  lastSeen: string
  permalink: string
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
      <div>
        <p className="text-sm font-medium text-foreground">{row.original.title}</p>
        <p className="text-xs text-muted-foreground font-mono">{row.original.shortId}</p>
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
    format: (value) => <span className="text-sm text-muted-foreground">{value as string}</span>,
  },
  {
    type: 'text',
    header: 'Last Seen',
    accessorKey: 'lastSeen',
    format: (value) => (
      <span className="text-sm text-muted-foreground">{formatRelativeTime(value as string)}</span>
    ),
  },
]

const SentryIssues = () => {
  const adapter = useAdapter()
  const [issues, setIssues] = useState<SentryIssue[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { projects, selectedProject, loading, handleProjectChange } = useProjectFilter(
    adapter,
    async (slug) => {
      setDataLoading(true)
      try {
        const params = slug && slug !== ALL_PROJECTS ? `?project=${encodeURIComponent(slug)}` : ''
        const data = await adapter.request<SentryIssue[]>(`/sentry/admin/issues${params}`)
        setIssues(data)
      } catch (error) {
        console.error('[Sentry] Failed to fetch issues:', error)
      } finally {
        setDataLoading(false)
      }
    },
  )

  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return issues
    return issues.filter(
      (i) => i.title.toLowerCase().includes(q) || i.shortId.toLowerCase().includes(q),
    )
  }, [issues, searchQuery])

  const projectSelector =
    projects.length > 0 ? (
      <Select value={selectedProject} onValueChange={handleProjectChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_PROJECTS}>All Projects</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.slug} value={p.slug}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : null

  const renderToolbar = () => (
    <div className="px-6 py-4 flex flex-col sm:flex-row gap-3 items-center justify-between flex-none border-b border-border bg-background">
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search issues..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
        Clear Filters
      </Button>
    </div>
  )

  const renderPagination = (table: DataTableRenderContext<SentryIssue>) => {
    const { pageIndex, pageSize } = table.getState().pagination
    const totalRows = table.getFilteredRowModel().rows.length
    const startRow = pageIndex * pageSize + 1
    const endRow = Math.min((pageIndex + 1) * pageSize, totalRows)

    return (
      <div className="flex-none px-6 py-4 border-t border-border bg-background flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{startRow}</span> to{' '}
          <span className="font-medium text-foreground">{endRow}</span> of{' '}
          <span className="font-medium text-foreground">{totalRows}</span> results
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    )
  }

  if (loading || dataLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
        <PageHeader title="Sentry Issues" actions={projectSelector ?? undefined} />
        <div className="flex-1 p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
      <PageHeader
        title="Sentry Issues"
        description={`${issues.length} issue(s) loaded.`}
        actions={projectSelector ?? undefined}
      />
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/50">
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-auto">
            <DataTable
              columns={columns}
              data={filteredIssues}
              options={{
                rowActions: {
                  items: [
                    {
                      label: 'Open in Sentry',
                      onSelect: (row) => {
                        window.open(row.permalink, '_blank', 'noopener,noreferrer')
                      },
                    },
                  ],
                },
              }}
              getRowId={(row) => row.id}
              renderToolbar={renderToolbar}
              renderPagination={renderPagination}
              enablePagination
              pageSizeOptions={[5, 10, 20, 30, 50]}
              initialPagination={{ pageIndex: 0, pageSize: 10 }}
              showCount={false}
              className="h-full flex flex-col"
              variant="content-manager"
              renderEmpty={() => (
                <span className="text-sm text-muted-foreground">
                  {issues.length === 0 ? 'No issues found' : 'No matching issues'}
                </span>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SentryIssues
