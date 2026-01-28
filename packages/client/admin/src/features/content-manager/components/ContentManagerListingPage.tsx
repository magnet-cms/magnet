import { DataTable, type DataTableColumn, type DataTableRenderContext } from '@magnet-cms/ui'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import type { SchemaProperty } from '@magnet-cms/common'
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '~/features/shared'
import { useSchema } from '~/hooks/useDiscovery'
import { useContentList, useContentDelete, useContentCreateEmpty } from '~/hooks/useSchema'

// Styles for content-manager variant
const contentManagerStyles = `
  .table-row-hover:hover td {
    background-color: #F9FAFB;
  }
  .table-row-hover.group:hover td {
    background-color: #F9FAFB;
  }
`

interface ContentManagerListingPageProps {
  schema: string
  schemaDisplayName: string
}

// Generic content entry type
type ContentEntry = Record<string, unknown> & {
  _id?: string
  id?: string
  documentId?: string
  createdAt?: string
  updatedAt?: string
  status?: string
}

const statusColors: Record<string, { bg: string; text: string; ring: string }> = {
  published: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    ring: 'ring-green-600/20',
  },
  draft: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    ring: 'ring-gray-500/10',
  },
  review: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    ring: 'ring-yellow-600/20',
  },
  archived: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    ring: 'ring-gray-500/10',
  },
}

/**
 * Get a display value for a cell based on the property type
 */
function formatCellValue(value: unknown, property: SchemaProperty): string {
  if (value === null || value === undefined) {
    return '-'
  }

  // Handle dates
  if (property.type === 'Date' || property.name.toLowerCase().includes('date') ||
      property.name === 'createdAt' || property.name === 'updatedAt') {
    const date = new Date(value as string)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }
  }

  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.length > 0 ? `${value.length} items` : '-'
  }

  // Handle objects (relations)
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    // Try to get a display name from the object
    return (obj.name as string) || (obj.title as string) || (obj._id as string) || JSON.stringify(value)
  }

  return String(value)
}

/**
 * Generate columns from schema properties
 */
function generateColumns(
  properties: SchemaProperty[],
): DataTableColumn<ContentEntry>[] {
  // Filter out internal fields and limit to first 5 visible columns
  const visibleProps = properties
    .filter(p => !p.name.startsWith('_'))
    .slice(0, 5)

  const columns: DataTableColumn<ContentEntry>[] = visibleProps.map(prop => ({
    type: 'custom' as const,
    header: prop.ui?.label || prop.name.charAt(0).toUpperCase() + prop.name.slice(1),
    cell: (row) => {
      const value = row.original[prop.name]
      const formatted = formatCellValue(value, prop)
      return <span className="text-sm text-gray-700">{formatted}</span>
    },
  }))

  // Add status column if schema has versioning
  columns.push({
    type: 'custom',
    header: 'Status',
    cell: (row) => {
      const status = (row.original.status as string) || 'draft'
      const colors = statusColors[status.toLowerCase()] || statusColors.draft
      return (
        <span
          className={cn(
            'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize',
            colors?.bg,
            colors?.text,
            colors?.ring
          )}
        >
          {status}
        </span>
      )
    },
  })

  // Add updated date column
  columns.push({
    type: 'custom',
    header: 'Updated',
    cell: (row) => {
      const date = row.original.updatedAt as string
      if (!date) return <span className="text-sm text-gray-500">-</span>
      const formatted = new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      return <span className="text-sm text-gray-500">{formatted}</span>
    },
  })

  return columns
}

/**
 * Get row ID from content entry
 */
function getEntryId(entry: ContentEntry): string {
  return (entry.documentId as string) || (entry._id as string) || (entry.id as string) || ''
}

export function ContentManagerListingPage({
  schema,
  schemaDisplayName,
}: ContentManagerListingPageProps) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Fetch schema metadata for column generation
  const { data: schemaMetadata, isLoading: isSchemaLoading } = useSchema(schema)

  // Fetch content data
  const { data: contentData, isLoading: isContentLoading, error: contentError } = useContentList<ContentEntry>(
    schema,
    statusFilter !== 'all' ? { status: statusFilter as 'draft' | 'published' } : undefined
  )

  // Mutations
  const { mutate: deleteContent } = useContentDelete()
  const { mutate: createEmpty, isPending: isCreating } = useContentCreateEmpty()

  // Handle edit action
  const handleEdit = (entry: ContentEntry) => {
    const id = getEntryId(entry)
    navigate(`/content-manager/${schema}/${id}`)
  }

  // Handle delete action
  const handleDelete = (entry: ContentEntry) => {
    const id = getEntryId(entry)
    if (!id) {
      toast.error('Cannot delete entry: missing ID')
      return
    }

    deleteContent(
      { schema, documentId: id },
      {
        onSuccess: () => {
          toast.success('Entry deleted successfully')
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to delete entry')
        },
      }
    )
  }

  // Handle create new entry
  const handleCreate = () => {
    createEmpty(
      { schema },
      {
        onSuccess: (data) => {
          toast.success('New entry created')
          navigate(`/content-manager/${schema}/${data.documentId}`)
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to create entry')
        },
      }
    )
  }

  // Generate columns from schema metadata
  const columns = useMemo(() => {
    if (!schemaMetadata || 'error' in schemaMetadata) {
      return []
    }
    return generateColumns(schemaMetadata.properties)
  }, [schemaMetadata])

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!contentData) return []
    if (!searchQuery) return contentData

    return contentData.filter((entry) => {
      // Search across all string fields
      return Object.values(entry).some(value =>
        typeof value === 'string' &&
        value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })
  }, [contentData, searchQuery])

  const isLoading = isSchemaLoading || isContentLoading

  const renderToolbar = () => {
    return (
      <div className="px-6 py-4 flex flex-col sm:flex-row gap-3 items-center justify-between flex-none bg-white border-b border-gray-200">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="text-gray-400"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 14L11.1 11.1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <Input
            type="text"
            className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all shadow-sm"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="appearance-none pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 shadow-sm cursor-pointer min-w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-gray-50">
            <Button
              variant="ghost"
              size="sm"
              className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900"
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderPagination = (table: DataTableRenderContext<ContentEntry>) => {
    const { pageIndex, pageSize } = table.getState().pagination
    const totalRows = table.getFilteredRowModel().rows.length
    const startRow = totalRows > 0 ? pageIndex * pageSize + 1 : 0
    const endRow = Math.min((pageIndex + 1) * pageSize, totalRows)

    return (
      <div className="flex-none px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Showing <span className="font-medium text-gray-900">{startRow}</span> to{' '}
          <span className="font-medium text-gray-900">{endRow}</span> of{' '}
          <span className="font-medium text-gray-900">{totalRows}</span> results
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium text-gray-400 cursor-not-allowed bg-gray-50"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
        <PageHeader>
          <div className="h-16 flex items-center justify-between px-6">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
                {schemaDisplayName}
              </h1>
              <p className="text-xs text-gray-500">Loading...</p>
            </div>
          </div>
        </PageHeader>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  // Error state
  if (contentError) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
        <PageHeader>
          <div className="h-16 flex items-center justify-between px-6">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
                {schemaDisplayName}
              </h1>
              <p className="text-xs text-red-500">Error loading content</p>
            </div>
          </div>
        </PageHeader>
        <div className="flex-1 p-6">
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">{contentError.message}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
      <style>{contentManagerStyles}</style>

      {/* Header */}
      <PageHeader>
        {/* Toolbar: Title & Actions */}
        <div className="h-16 flex items-center justify-between px-6">
          {/* Left: Title */}
          <div>
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
              {schemaDisplayName}
            </h1>
            <p className="text-xs text-gray-500">
              Manage your {schemaDisplayName.toLowerCase()} entries and publications.
            </p>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Configure view')
              }}
            >
              Configure View
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create New Entry'}
            </Button>
          </div>
        </div>
      </PageHeader>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* Content Table */}
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-auto">
            {filteredData.length === 0 && !searchQuery ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No entries yet</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Get started by creating your first {schemaDisplayName.toLowerCase()} entry.
                </p>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create New Entry'}
                </Button>
              </div>
            ) : (
              <DataTable
                data={filteredData}
                columns={columns}
                options={{
                  selectable: true,
                  rowActions: {
                    items: [
                      {
                        label: 'Edit',
                        onSelect: (row) => handleEdit(row),
                      },
                      {
                        label: 'Delete',
                        onSelect: (row) => handleDelete(row),
                        destructive: true,
                      },
                    ],
                  },
                }}
                getRowId={(row) => getEntryId(row)}
                renderToolbar={renderToolbar}
                renderPagination={renderPagination}
                enablePagination={true}
                pageSizeOptions={[5, 10, 20, 30, 50]}
                initialPagination={{ pageIndex: 0, pageSize: 10 }}
                showCount={false}
                className="h-full flex flex-col"
                variant="content-manager"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
