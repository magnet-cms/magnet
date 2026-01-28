'use client'

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
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '~/features/shared'
import {
  useUserList,
  useUserDelete,
  useUserCreate,
  useUserUpdate,
  type User as ApiUser,
  type CreateUserData,
} from '~/hooks/useUsers'
import { useRoleList } from '~/hooks/useRoles'

import { CreateUserDrawer } from './CreateUserDrawer'

// Styles for content-manager variant
const contentManagerStyles = `
  .table-row-hover:hover td {
    background-color: #F9FAFB;
  }
  .table-row-hover.group:hover td {
    background-color: #F9FAFB;
  }
`

interface User {
  id: string
  name: string
  email: string
  role: string
  status: 'Active' | 'Inactive' | 'Pending'
  lastLogin: string
  createdAt: string
}

const statusColors: Record<string, { bg: string; text: string; ring: string }> = {
  Active: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    ring: 'ring-green-600/20',
  },
  Inactive: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    ring: 'ring-gray-500/10',
  },
  Pending: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    ring: 'ring-yellow-600/20',
  },
}

// Transform API user to display user
function transformUser(apiUser: ApiUser): User {
  const status: User['status'] = apiUser.isActive === false
    ? 'Inactive'
    : apiUser.lastLogin
      ? 'Active'
      : 'Pending'

  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    role: apiUser.role,
    status,
    lastLogin: apiUser.lastLogin
      ? formatRelativeTime(new Date(apiUser.lastLogin))
      : 'Never',
    createdAt: new Date(apiUser.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  }
}

// Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

export function UsersListingPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All Status')
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false)
  const [page, _setPage] = useState(1)

  // API hooks
  const { data: usersData, isLoading, error, refetch } = useUserList(page, 50)
  const { data: roles } = useRoleList()
  const { mutate: deleteUser } = useUserDelete()
  const { mutate: createUser } = useUserCreate()
  const { mutate: updateUser } = useUserUpdate()

  // Transform API users to display format
  const users: User[] = useMemo(() => {
    if (!usersData?.users) return []
    return usersData.users.map(transformUser)
  }, [usersData])

  // Build role options from API
  const roleOptions = useMemo(() => {
    if (!roles) {
      // Fallback defaults
      return [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Viewer', value: 'viewer' },
      ]
    }
    return roles.map((role) => ({
      label: role.name.charAt(0).toUpperCase() + role.name.slice(1),
      value: role.name,
    }))
  }, [roles])

  const handleRoleChange = (userId: string, newRole: string) => {
    updateUser(
      { id: userId, data: { role: newRole } },
      {
        onSuccess: () => {
          toast.success('User role updated')
          refetch()
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to update role')
        },
      }
    )
  }

  const handleCreateUser = (userData: {
    name: string
    email: string
    role: string
    password: string
  }) => {
    const data: CreateUserData = {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role,
    }

    createUser(data, {
      onSuccess: () => {
        toast.success('User created successfully')
        setCreateUserModalOpen(false)
        refetch()
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to create user')
      },
    })
  }

  const handleDeleteUser = (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return

    deleteUser(userId, {
      onSuccess: () => {
        toast.success('User deleted')
        refetch()
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to delete user')
      },
    })
  }

  const columns: DataTableColumn<User>[] = [
    {
      type: 'text',
      header: 'Name',
      accessorKey: 'name',
      format: (value) => <div className="text-sm font-medium text-gray-900">{value as string}</div>,
    },
    {
      type: 'text',
      header: 'Email',
      accessorKey: 'email',
      format: (value) => <div className="text-sm text-gray-600">{value as string}</div>,
    },
    {
      type: 'selector',
      header: 'Role',
      accessorKey: 'role',
      options: roleOptions,
      placeholder: 'Select role',
      onChange: (value, row) => {
        handleRoleChange(row.id, value)
      },
    },
    {
      type: 'custom',
      header: 'Status',
      cell: (row) => {
        const status = row.original.status
        const colors = statusColors[status] ?? {
          bg: 'bg-gray-100',
          text: 'text-gray-600',
          ring: 'ring-gray-500/10',
        }
        return (
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${colors.bg} ${colors.text} ${colors.ring}`}
          >
            {status}
          </span>
        )
      },
    },
    {
      type: 'text',
      header: 'Last Login',
      accessorKey: 'lastLogin',
      format: (value) => <span className="text-sm text-gray-500">{value as string}</span>,
    },
    {
      type: 'text',
      header: 'Created',
      accessorKey: 'createdAt',
      format: (value) => <span className="text-sm text-gray-500">{value as string}</span>,
    },
  ]

  const filteredData = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'All Status' || user.status === statusFilter
    return matchesSearch && matchesStatus
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
            placeholder="Search users..."
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
              <SelectItem value="All Status">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-gray-50">
            <Button
              variant="ghost"
              size="sm"
              className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900"
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('All Status')
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderPagination = (table: DataTableRenderContext<User>) => {
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
        <PageHeader>
          <div className="h-16 flex items-center justify-between px-6">
            <div>
              <Skeleton className="h-6 w-24 mb-1" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-9 w-28" />
          </div>
        </PageHeader>
        <div className="flex-1 p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
        <PageHeader>
          <div className="h-16 flex items-center justify-between px-6">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Users</h1>
              <p className="text-xs text-gray-500">Manage users and their roles.</p>
            </div>
          </div>
        </PageHeader>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 mb-4">{error.message || 'Failed to load users'}</p>
            <Button onClick={() => refetch()}>Retry</Button>
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
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Users</h1>
            <p className="text-xs text-gray-500">
              Manage users and their roles. {usersData?.total || 0} user(s) total.
            </p>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={() => setCreateUserModalOpen(true)}>
              Create User
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
                        // Would open edit drawer
                        console.log('Edit', row)
                      },
                    },
                    {
                      label: 'Delete',
                      onSelect: (row) => handleDeleteUser(row.id),
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
              initialPagination={{ pageIndex: 0, pageSize: 10 }}
              showCount={false}
              className="h-full flex flex-col"
              variant="content-manager"
            />
          </div>
        </div>
      </div>

      <CreateUserDrawer
        open={createUserModalOpen}
        onOpenChange={setCreateUserModalOpen}
        onCreate={handleCreateUser}
        roleOptions={roleOptions}
      />
    </div>
  )
}
