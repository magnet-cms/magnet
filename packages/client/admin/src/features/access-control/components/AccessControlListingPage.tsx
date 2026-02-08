import {
	DataTable,
	type DataTableColumn,
	type DataTableRenderContext,
} from '@magnet-cms/ui'
import { Button, Input, Skeleton } from '@magnet-cms/ui'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '~/features/shared'
import {
	type CreateRoleData,
	type RoleListItem,
	useRoleCreate,
	useRoleDelete,
	useRoleList,
} from '~/hooks/useRoles'

import { CreateRoleDrawer } from './CreateRoleDrawer'

const contentManagerStyles = `
  .table-row-hover:hover td {
    background-color: #F9FAFB;
  }
  .table-row-hover.group:hover td {
    background-color: #F9FAFB;
  }
`

interface RoleDisplay {
	id: string
	name: string
	displayName: string
	description: string
	userCount: number
	lastUpdated: string
	isSystem: boolean
}

function formatRelativeTime(dateStr: string | undefined): string {
	if (!dateStr) return 'Never'
	const date = new Date(dateStr)
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

function transformRole(role: RoleListItem): RoleDisplay {
	return {
		id: role.id,
		name: role.name,
		displayName: role.displayName,
		description: role.description || '',
		userCount: role.userCount,
		lastUpdated: formatRelativeTime(role.updatedAt || role.createdAt),
		isSystem: role.isSystem,
	}
}

export function AccessControlListingPage() {
	const [searchQuery, setSearchQuery] = useState('')
	const [createRoleOpen, setCreateRoleOpen] = useState(false)
	const navigate = useNavigate()

	const { data: rolesData, isLoading, error, refetch } = useRoleList()
	const { mutate: createRole } = useRoleCreate()
	const { mutate: deleteRole } = useRoleDelete()

	const roles: RoleDisplay[] = useMemo(() => {
		if (!rolesData) return []
		return rolesData.map(transformRole)
	}, [rolesData])

	const handleCreateRole = (data: {
		name: string
		displayName: string
		description?: string
	}) => {
		const createData: CreateRoleData = {
			name: data.name,
			displayName: data.displayName,
			description: data.description,
		}

		createRole(createData, {
			onSuccess: () => {
				toast.success('Role created successfully')
				setCreateRoleOpen(false)
				refetch()
			},
			onError: (err) => {
				toast.error(err.message || 'Failed to create role')
			},
		})
	}

	const handleDeleteRole = (role: RoleDisplay) => {
		if (role.isSystem) {
			toast.error('System roles cannot be deleted')
			return
		}

		if (
			!window.confirm(
				`Are you sure you want to delete the "${role.displayName}" role? This cannot be undone.`,
			)
		) {
			return
		}

		deleteRole(role.id, {
			onSuccess: () => {
				toast.success(`Role "${role.displayName}" deleted`)
				refetch()
			},
			onError: (err) => {
				toast.error(err.message || 'Failed to delete role')
			},
		})
	}

	const columns: DataTableColumn<RoleDisplay>[] = [
		{
			type: 'custom',
			header: 'Role Name',
			cell: (row) => {
				const role = row.original
				return (
					<div className="flex items-center gap-2">
						<Link
							to={`/access-control/${role.id}`}
							className="text-sm font-medium text-gray-900 hover:text-gray-700 transition-colors"
						>
							{role.displayName}
						</Link>
						{role.isSystem && (
							<span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
								System
							</span>
						)}
					</div>
				)
			},
		},
		{
			type: 'text',
			header: 'Description',
			accessorKey: 'description',
			format: (value) => (
				<div className="text-sm text-gray-600 max-w-md">{value as string}</div>
			),
		},
		{
			type: 'text',
			header: 'Users',
			accessorKey: 'userCount',
			format: (value) => (
				<span className="text-sm text-gray-900 font-medium">
					{value as number}
				</span>
			),
		},
		{
			type: 'text',
			header: 'Last Updated',
			accessorKey: 'lastUpdated',
			format: (value) => (
				<span className="text-sm text-gray-500">{value as string}</span>
			),
		},
	]

	const filteredData = roles.filter((role) => {
		const matchesSearch =
			role.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			role.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
			role.name.toLowerCase().includes(searchQuery.toLowerCase())
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

	const renderPagination = (table: DataTableRenderContext<RoleDisplay>) => {
		const { pageIndex, pageSize } = table.getState().pagination
		const totalRows = table.getFilteredRowModel().rows.length
		const startRow = pageIndex * pageSize + 1
		const endRow = Math.min((pageIndex + 1) * pageSize, totalRows)

		return (
			<div className="flex-none px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between">
				<div className="text-xs text-gray-500">
					Showing <span className="font-medium text-gray-900">{startRow}</span>{' '}
					to <span className="font-medium text-gray-900">{endRow}</span> of{' '}
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

	if (isLoading) {
		return (
			<div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
				<PageHeader>
					<div className="h-16 flex items-center justify-between px-6">
						<div>
							<Skeleton className="h-6 w-32 mb-1" />
							<Skeleton className="h-4 w-64" />
						</div>
						<Skeleton className="h-9 w-36" />
					</div>
				</PageHeader>
				<div className="flex-1 p-6">
					<Skeleton className="h-96 w-full" />
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
				<PageHeader>
					<div className="h-16 flex items-center justify-between px-6">
						<div>
							<h1 className="text-lg font-semibold text-gray-900 tracking-tight">
								Access Control
							</h1>
							<p className="text-xs text-gray-500">
								Manage roles and permissions for your application.
							</p>
						</div>
					</div>
				</PageHeader>
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center">
						<p className="text-gray-500 mb-4">
							{error.message || 'Failed to load roles'}
						</p>
						<Button onClick={() => refetch()}>Retry</Button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
			<style>{contentManagerStyles}</style>

			<PageHeader>
				<div className="h-16 flex items-center justify-between px-6">
					<div>
						<h1 className="text-lg font-semibold text-gray-900 tracking-tight">
							Access Control
						</h1>
						<p className="text-xs text-gray-500">
							Manage roles and permissions for your application. {roles.length}{' '}
							role(s) total.
						</p>
					</div>

					<div className="flex items-center gap-3">
						<Button size="sm" onClick={() => setCreateRoleOpen(true)}>
							Create New Role
						</Button>
					</div>
				</div>
			</PageHeader>

			<div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
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
												navigate(`/access-control/${row.id}`)
											},
										},
										{
											label: 'Delete',
											onSelect: (row) => {
												handleDeleteRole(row)
											},
											destructive: true,
											disabled: (row) => row.isSystem,
										},
									],
								},
							}}
							getRowId={(row) => row.id}
							renderToolbar={renderToolbar}
							renderPagination={renderPagination}
							enablePagination={true}
							pageSizeOptions={[5, 10, 20, 30, 50]}
							initialPagination={{
								pageIndex: 0,
								pageSize: 10,
							}}
							showCount={false}
							className="h-full flex flex-col"
							variant="content-manager"
						/>
					</div>
				</div>
			</div>

			<CreateRoleDrawer
				open={createRoleOpen}
				onOpenChange={setCreateRoleOpen}
				onCreate={handleCreateRole}
			/>
		</div>
	)
}
