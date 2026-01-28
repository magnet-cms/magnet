import { DataTable, type DataTableColumn, type DataTableRenderContext } from '@magnet-cms/ui'
import { Button, Input } from '@magnet-cms/ui'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { PageHeader } from '~/features/shared'

// Styles for content-manager variant
const contentManagerStyles = `
  .table-row-hover:hover td {
    background-color: #F9FAFB;
  }
  .table-row-hover.group:hover td {
    background-color: #F9FAFB;
  }
`

interface Role {
  id: string
  name: string
  description: string
  userCount: number
  lastUpdated: string
}

// Mock data
const mockRoles: Role[] = [
  {
    id: 'authenticated',
    name: 'Authenticated Role',
    description: 'Default role given to authenticated users.',
    userCount: 1240,
    lastUpdated: '2 hours ago',
  },
  {
    id: 'public',
    name: 'Public Role',
    description: 'Default role for unauthenticated users.',
    userCount: 0,
    lastUpdated: 'Oct 24, 2023',
  },
  {
    id: 'admin',
    name: 'Admin Role',
    description: 'Full access to all features and settings.',
    userCount: 5,
    lastUpdated: 'Oct 22, 2023',
  },
  {
    id: 'editor',
    name: 'Editor Role',
    description: 'Can create and edit content, but cannot delete.',
    userCount: 12,
    lastUpdated: 'Oct 20, 2023',
  },
  {
    id: 'viewer',
    name: 'Viewer Role',
    description: 'Read-only access to content.',
    userCount: 45,
    lastUpdated: 'Oct 15, 2023',
  },
]

export function AccessControlListingPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const columns: DataTableColumn<Role>[] = [
    {
      type: 'custom',
      header: 'Role Name',
      cell: (row) => {
        const role = row.original
        return (
          <Link
            to={`/access-control/${role.id}`}
            className="text-sm font-medium text-gray-900 hover:text-gray-700 transition-colors"
          >
            {role.name}
          </Link>
        )
      },
    },
    {
      type: 'text',
      header: 'Description',
      accessorKey: 'description',
      format: (value) => <div className="text-sm text-gray-600 max-w-md">{value as string}</div>,
    },
    {
      type: 'text',
      header: 'Users',
      accessorKey: 'userCount',
      format: (value) => (
        <span className="text-sm text-gray-900 font-medium">{value as number}</span>
      ),
    },
    {
      type: 'text',
      header: 'Last Updated',
      accessorKey: 'lastUpdated',
      format: (value) => <span className="text-sm text-gray-500">{value as string}</span>,
    },
  ]

  const filteredData = mockRoles.filter((role) => {
    const matchesSearch =
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

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
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-gray-50">
            <Button
              variant="ghost"
              size="sm"
              className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900"
              onClick={() => {
                setSearchQuery('')
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderPagination = (table: DataTableRenderContext<Role>) => {
    const { pageIndex, pageSize } = table.getState().pagination
    const totalRows = table.getFilteredRowModel().rows.length
    const startRow = pageIndex * pageSize + 1
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

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
      <style>{contentManagerStyles}</style>

      {/* Header */}
      <PageHeader>
        {/* Toolbar: Title & Actions */}
        <div className="h-16 flex items-center justify-between px-6">
          {/* Left: Title */}
          <div>
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Access Control</h1>
            <p className="text-xs text-gray-500">
              Manage roles and permissions for your application.
            </p>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => {
                console.log('Create new role')
              }}
            >
              Create New Role
            </Button>
          </div>
        </div>
      </PageHeader>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* Content Table */}
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-auto">
            <DataTable
              data={filteredData}
              columns={columns}
              options={{
                selectable: true,
                rowActions: {
                  items: [
                    {
                      label: 'Edit',
                      onSelect: (row) => {
                        window.location.href = `/access-control/${row.id}`
                      },
                    },
                    {
                      label: 'Delete',
                      onSelect: (row) => {
                        console.log('Delete', row)
                      },
                      destructive: true,
                    },
                  ],
                },
              }}
              getRowId={(row) => row.id}
              renderToolbar={renderToolbar}
              renderPagination={renderPagination}
              enablePagination={true}
              pageSizeOptions={[5, 10, 20, 30, 50]}
              initialPagination={{ pageIndex: 0, pageSize: 5 }}
              showCount={false}
              className="h-full flex flex-col"
              variant="content-manager"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
