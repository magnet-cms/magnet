'use client'

import {
	Button,
	DataTable,
	type DataTableColumn,
	type DataTableRenderContext,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Skeleton,
} from '@magnet-cms/ui'
import {
	Activity,
	FilePen,
	Key,
	LogIn,
	LogOut,
	Plus,
	Send,
	Settings,
	Trash2,
	Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type {
	ActivityRecord,
	ActivitySearchParams,
} from '~/core/adapters/types'
import { PageHeader } from '~/features/shared'
import { useActivitySearch } from '~/hooks/useActivity'
import { useUserList } from '~/hooks/useUsers'
import { useAppIntl } from '~/i18n'

// ============================================================================
// Helpers
// ============================================================================

function getActionIcon(action: string) {
	if (action.startsWith('content.created')) return Plus
	if (action.startsWith('content.updated')) return FilePen
	if (action.startsWith('content.deleted')) return Trash2
	if (action.startsWith('content.published')) return Send
	if (action === 'user.login') return LogIn
	if (action === 'user.logout') return LogOut
	if (action.startsWith('user.')) return Users
	if (action.startsWith('settings.')) return Settings
	if (action.startsWith('api_key.')) return Key
	return Activity
}

function formatRelativeTime(timestamp: string): string {
	const diff = Date.now() - new Date(timestamp).getTime()
	const seconds = Math.floor(diff / 1000)
	if (seconds < 60) return 'Just now'
	const minutes = Math.floor(seconds / 60)
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.floor(hours / 24)
	return `${days}d ago`
}

// ============================================================================
// Filter Options
// ============================================================================

const ACTION_OPTIONS = [
	{ label: 'All Actions', value: 'all' },
	{ label: 'Content Created', value: 'content.created' },
	{ label: 'Content Updated', value: 'content.updated' },
	{ label: 'Content Deleted', value: 'content.deleted' },
	{ label: 'Content Published', value: 'content.published' },
	{ label: 'User Login', value: 'user.login' },
	{ label: 'User Logout', value: 'user.logout' },
	{ label: 'Settings Updated', value: 'settings.updated' },
	{ label: 'API Key Created', value: 'api_key.created' },
	{ label: 'API Key Revoked', value: 'api_key.revoked' },
]

const ENTITY_TYPE_OPTIONS = [
	{ label: 'All Types', value: 'all' },
	{ label: 'Content', value: 'content' },
	{ label: 'User', value: 'user' },
	{ label: 'Settings', value: 'settings' },
	{ label: 'API Key', value: 'api_key' },
]

// Styles for content-manager variant
const contentManagerStyles = `
  .table-row-hover:hover td {
    background-color: #F9FAFB;
  }
  .table-row-hover.group:hover td {
    background-color: #F9FAFB;
  }
`

// ============================================================================
// Component
// ============================================================================

export function ActivityPage() {
	const intl = useAppIntl()
	const [actionFilter, setActionFilter] = useState('all')
	const [entityTypeFilter, setEntityTypeFilter] = useState('all')
	const [userFilter, setUserFilter] = useState('all')

	// Fetch users for the dropdown
	const { data: usersData } = useUserList(1, 100)
	const users = usersData?.users ?? []

	// Build search params from filters — treat 'all' and 'system' specially
	const searchParams: ActivitySearchParams = {
		limit: 500,
		offset: 0,
		action: actionFilter !== 'all' ? actionFilter : undefined,
		entityType: entityTypeFilter !== 'all' ? entityTypeFilter : undefined,
		userId:
			userFilter !== 'all' && userFilter !== 'system' ? userFilter : undefined,
	}

	const { data, isLoading, error } = useActivitySearch(searchParams)

	// Build user options for dropdown: All + System + real users
	const userOptions = useMemo(
		() => [
			{ label: 'All Users', value: 'all' },
			{ label: 'System', value: 'system' },
			...users.map((u) => ({ label: u.name || u.email, value: u.id })),
		],
		[users],
	)

	// Determine items to show — for 'system' filter, filter client-side
	const items = useMemo(() => {
		if (!data?.items) return []
		if (userFilter === 'system') {
			// System events have no userId or userId is 'system'
			return data.items.filter((r) => !r.userId || r.userId === 'system')
		}
		return data.items
	}, [data?.items, userFilter])

	// ============================================================================
	// Columns
	// ============================================================================

	const columns: DataTableColumn<ActivityRecord>[] = [
		{
			type: 'custom',
			header: 'Action',
			cell: (row) => {
				const record = row.original
				const Icon = getActionIcon(record.action)
				return (
					<div className="flex items-center gap-2">
						<div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
							<Icon className="w-3 h-3 text-gray-600" />
						</div>
						<span className="text-sm font-medium text-gray-900">
							{record.action}
						</span>
					</div>
				)
			},
		},
		{
			type: 'custom',
			header: 'Entity',
			cell: (row) => {
				const record = row.original
				const label = record.entityName || record.entityId
				return (
					<div className="text-sm text-gray-600">
						<span className="font-medium">{record.entityType}</span>
						{label ? <span className="text-gray-400"> · {label}</span> : null}
					</div>
				)
			},
		},
		{
			type: 'text',
			header: 'User',
			accessorKey: 'userName',
			format: (value, row) => (
				<span className="text-sm text-gray-600">
					{(value as string) || row.userId || '—'}
				</span>
			),
		},
		{
			type: 'text',
			header: 'Timestamp',
			accessorKey: 'timestamp',
			format: (value) => (
				<span className="text-sm text-gray-400">
					{formatRelativeTime(value as string)}
				</span>
			),
		},
	]

	// ============================================================================
	// Toolbar
	// ============================================================================

	const renderToolbar = () => (
		<div className="px-6 py-4 flex flex-col sm:flex-row gap-3 items-center justify-between flex-none bg-white border-b border-gray-200">
			<div className="flex items-center gap-3 w-full flex-wrap">
				<Select value={actionFilter} onValueChange={setActionFilter}>
					<SelectTrigger className="appearance-none pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 shadow-sm cursor-pointer min-w-[140px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{ACTION_OPTIONS.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
					<SelectTrigger className="appearance-none pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 shadow-sm cursor-pointer min-w-[130px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{ENTITY_TYPE_OPTIONS.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={userFilter} onValueChange={setUserFilter}>
					<SelectTrigger className="appearance-none pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 shadow-sm cursor-pointer min-w-[130px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{userOptions.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-gray-50">
					<Button
						variant="ghost"
						size="sm"
						className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900"
						onClick={() => {
							setActionFilter('all')
							setEntityTypeFilter('all')
							setUserFilter('all')
						}}
					>
						Clear Filters
					</Button>
				</div>
			</div>
		</div>
	)

	// ============================================================================
	// Pagination
	// ============================================================================

	const renderPagination = (table: DataTableRenderContext<ActivityRecord>) => {
		const { pageIndex, pageSize } = table.getState().pagination
		const totalRows = table.getFilteredRowModel().rows.length
		const startRow = totalRows > 0 ? pageIndex * pageSize + 1 : 0
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

	// ============================================================================
	// Loading state
	// ============================================================================

	if (isLoading) {
		return (
			<div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
				<PageHeader>
					<div className="h-16 flex items-center justify-between px-6">
						<div>
							<Skeleton className="h-6 w-24 mb-1" />
							<Skeleton className="h-4 w-48" />
						</div>
					</div>
				</PageHeader>
				<div className="flex-1 p-6">
					<Skeleton className="h-96 w-full" />
				</div>
			</div>
		)
	}

	// ============================================================================
	// Error state
	// ============================================================================

	if (error) {
		return (
			<div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
				<PageHeader>
					<div className="h-16 flex items-center justify-between px-6">
						<div>
							<h1 className="text-lg font-semibold text-gray-900 tracking-tight">
								{intl.formatMessage({
									id: 'activity.title',
									defaultMessage: 'Activity Log',
								})}
							</h1>
							<p className="text-xs text-red-500">Error loading activity</p>
						</div>
					</div>
				</PageHeader>
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center">
						<p className="text-gray-500 mb-4">
							{error.message || 'Failed to load activity records'}
						</p>
					</div>
				</div>
			</div>
		)
	}

	// ============================================================================
	// Main render
	// ============================================================================

	return (
		<div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
			<style>{contentManagerStyles}</style>

			{/* Header */}
			<PageHeader>
				<div className="h-16 flex items-center justify-between px-6">
					<div>
						<h1 className="text-lg font-semibold text-gray-900 tracking-tight">
							Activity Log
						</h1>
						<p className="text-xs text-gray-500">
							Audit trail of all user actions.{' '}
							{data?.total !== undefined ? `${data.total} records total.` : ''}
						</p>
					</div>
				</div>
			</PageHeader>

			{/* Main Workspace */}
			<div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
				<div className="flex-1 overflow-hidden relative">
					<div className="absolute inset-0 overflow-auto">
						<DataTable
							data={items}
							columns={columns}
							getRowId={(row) => row.id}
							renderToolbar={renderToolbar}
							renderPagination={renderPagination}
							enablePagination={true}
							pageSizeOptions={[10, 20, 50]}
							initialPagination={{ pageIndex: 0, pageSize: 20 }}
							showCount={false}
							className="h-full flex flex-col"
							variant="content-manager"
							renderEmpty={(_table) => (
								<div className="py-16 text-center">
									<Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
									<p className="text-sm text-gray-500">
										No activity records found
									</p>
								</div>
							)}
						/>
					</div>
				</div>
			</div>
		</div>
	)
}
