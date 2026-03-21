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

function formatRelativeTime(
	timestamp: string,
	intl: ReturnType<typeof useAppIntl>,
): string {
	const diff = Date.now() - new Date(timestamp).getTime()
	const seconds = Math.floor(diff / 1000)
	if (seconds < 60) {
		return intl.formatMessage({
			id: 'activity.relativeJustNow',
			defaultMessage: 'Just now',
		})
	}
	const minutes = Math.floor(seconds / 60)
	if (minutes < 60) {
		return intl.formatMessage(
			{
				id: 'activity.relativeMinutes',
				defaultMessage: '{count}m ago',
			},
			{ count: minutes },
		)
	}
	const hours = Math.floor(minutes / 60)
	if (hours < 24) {
		return intl.formatMessage(
			{
				id: 'activity.relativeHours',
				defaultMessage: '{count}h ago',
			},
			{ count: hours },
		)
	}
	const days = Math.floor(hours / 24)
	return intl.formatMessage(
		{
			id: 'activity.relativeDays',
			defaultMessage: '{count}d ago',
		},
		{ count: days },
	)
}

// ============================================================================
// Component
// ============================================================================

export function ActivityPage() {
	const intl = useAppIntl()
	const [actionFilter, setActionFilter] = useState('all')
	const [entityTypeFilter, setEntityTypeFilter] = useState('all')
	const [userFilter, setUserFilter] = useState('all')

	const actionOptions = useMemo(
		() => [
			{
				label: intl.formatMessage({
					id: 'activity.filterActionAll',
					defaultMessage: 'All Actions',
				}),
				value: 'all',
			},
			{
				label: intl.formatMessage({
					id: 'activity.filterActionContentCreated',
					defaultMessage: 'Content Created',
				}),
				value: 'content.created',
			},
			{
				label: intl.formatMessage({
					id: 'activity.filterActionContentUpdated',
					defaultMessage: 'Content Updated',
				}),
				value: 'content.updated',
			},
			{
				label: intl.formatMessage({
					id: 'activity.filterActionContentDeleted',
					defaultMessage: 'Content Deleted',
				}),
				value: 'content.deleted',
			},
			{
				label: intl.formatMessage({
					id: 'activity.filterActionContentPublished',
					defaultMessage: 'Content Published',
				}),
				value: 'content.published',
			},
			{
				label: intl.formatMessage({
					id: 'activity.filterActionUserLogin',
					defaultMessage: 'User Login',
				}),
				value: 'user.login',
			},
			{
				label: intl.formatMessage({
					id: 'activity.filterActionUserLogout',
					defaultMessage: 'User Logout',
				}),
				value: 'user.logout',
			},
			{
				label: intl.formatMessage({
					id: 'activity.filterActionSettingsUpdated',
					defaultMessage: 'Settings Updated',
				}),
				value: 'settings.updated',
			},
			{
				label: intl.formatMessage({
					id: 'activity.filterActionApiKeyCreated',
					defaultMessage: 'API Key Created',
				}),
				value: 'api_key.created',
			},
			{
				label: intl.formatMessage({
					id: 'activity.filterActionApiKeyRevoked',
					defaultMessage: 'API Key Revoked',
				}),
				value: 'api_key.revoked',
			},
		],
		[intl],
	)

	const entityTypeOptions = useMemo(
		() => [
			{
				label: intl.formatMessage({
					id: 'activity.filterEntityAll',
					defaultMessage: 'All Types',
				}),
				value: 'all',
			},
			{
				label: intl.formatMessage({
					id: 'activity.filterEntityContent',
					defaultMessage: 'Content',
				}),
				value: 'content',
			},
			{
				label: intl.formatMessage({
					id: 'activity.filterEntityUser',
					defaultMessage: 'User',
				}),
				value: 'user',
			},
			{
				label: intl.formatMessage({
					id: 'activity.filterEntitySettings',
					defaultMessage: 'Settings',
				}),
				value: 'settings',
			},
			{
				label: intl.formatMessage({
					id: 'activity.filterEntityApiKey',
					defaultMessage: 'API Key',
				}),
				value: 'api_key',
			},
		],
		[intl],
	)

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
			{
				label: intl.formatMessage({
					id: 'activity.filterUserAll',
					defaultMessage: 'All Users',
				}),
				value: 'all',
			},
			{
				label: intl.formatMessage({
					id: 'activity.filterUserSystem',
					defaultMessage: 'System',
				}),
				value: 'system',
			},
			...users.map((u) => ({ label: u.name || u.email, value: u.id })),
		],
		[intl, users],
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

	const columns: DataTableColumn<ActivityRecord>[] = useMemo(
		() => [
			{
				type: 'custom',
				header: intl.formatMessage({
					id: 'activity.columnAction',
					defaultMessage: 'Action',
				}),
				cell: (row) => {
					const record = row.original
					const Icon = getActionIcon(record.action)
					return (
						<div className="flex items-center gap-2">
							<div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
								<Icon className="size-3 text-muted-foreground" />
							</div>
							<span className="text-sm font-medium text-foreground">
								{record.action}
							</span>
						</div>
					)
				},
			},
			{
				type: 'custom',
				header: intl.formatMessage({
					id: 'activity.columnEntity',
					defaultMessage: 'Entity',
				}),
				cell: (row) => {
					const record = row.original
					const label = record.entityName || record.entityId
					return (
						<div className="text-sm text-muted-foreground">
							<span className="font-medium">{record.entityType}</span>
							{label ? (
								<span className="text-muted-foreground/70"> · {label}</span>
							) : null}
						</div>
					)
				},
			},
			{
				type: 'text',
				header: intl.formatMessage({
					id: 'activity.columnUser',
					defaultMessage: 'User',
				}),
				accessorKey: 'userName',
				format: (value, row) => (
					<span className="text-sm text-muted-foreground">
						{(value as string) || row.userId || '—'}
					</span>
				),
			},
			{
				type: 'text',
				header: intl.formatMessage({
					id: 'activity.columnTimestamp',
					defaultMessage: 'Timestamp',
				}),
				accessorKey: 'timestamp',
				format: (value) => (
					<span className="text-sm text-muted-foreground/80">
						{formatRelativeTime(value as string, intl)}
					</span>
				),
			},
		],
		[intl],
	)

	// ============================================================================
	// Toolbar
	// ============================================================================

	const renderToolbar = () => (
		<div className="flex-none flex flex-col gap-3 border-b border-border bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex w-full flex-wrap items-center gap-3">
				<Select value={actionFilter} onValueChange={setActionFilter}>
					<SelectTrigger className="min-w-[140px] cursor-pointer appearance-none rounded-lg border border-input bg-background py-1.5 pl-3 pr-8 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{actionOptions.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
					<SelectTrigger className="min-w-[130px] cursor-pointer appearance-none rounded-lg border border-input bg-background py-1.5 pl-3 pr-8 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{entityTypeOptions.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={userFilter} onValueChange={setUserFilter}>
					<SelectTrigger className="min-w-[130px] cursor-pointer appearance-none rounded-lg border border-input bg-background py-1.5 pl-3 pr-8 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
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

				<div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
					<Button
						variant="ghost"
						size="sm"
						className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
						onClick={() => {
							setActionFilter('all')
							setEntityTypeFilter('all')
							setUserFilter('all')
						}}
					>
						{intl.formatMessage({
							id: 'common.actions.clearFilters',
							defaultMessage: 'Clear Filters',
						})}
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
			<div className="flex-none flex items-center justify-between border-t border-border bg-background px-6 py-4">
				<div className="text-xs text-muted-foreground">
					{intl.formatMessage(
						{
							id: 'common.pagination.showing',
							defaultMessage: 'Showing {start} to {end} of {total} results',
						},
						{ start: startRow, end: endRow, total: totalRows },
					)}
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						className="cursor-not-allowed rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground/50"
						disabled={!table.getCanPreviousPage()}
						onClick={() => table.previousPage()}
					>
						{intl.formatMessage({
							id: 'common.actions.previous',
							defaultMessage: 'Previous',
						})}
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="rounded-md px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
						disabled={!table.getCanNextPage()}
						onClick={() => table.nextPage()}
					>
						{intl.formatMessage({
							id: 'common.actions.next',
							defaultMessage: 'Next',
						})}
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
			<div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-background">
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
			<div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-background">
				<PageHeader>
					<div className="h-16 flex items-center justify-between px-6">
						<div>
							<h1 className="text-lg font-semibold text-foreground tracking-tight">
								{intl.formatMessage({
									id: 'activity.title',
									defaultMessage: 'Activity Log',
								})}
							</h1>
							<p className="text-xs text-red-500">
								{intl.formatMessage({
									id: 'activity.errorLoadingShort',
									defaultMessage: 'Error loading activity',
								})}
							</p>
						</div>
					</div>
				</PageHeader>
				<div className="flex flex-1 items-center justify-center">
					<div className="text-center">
						<p className="mb-4 text-muted-foreground">
							{error.message ||
								intl.formatMessage({
									id: 'activity.failedToLoadRecords',
									defaultMessage: 'Failed to load activity records',
								})}
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
		<div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-background">
			{/* Header */}
			<PageHeader>
				<div className="h-16 flex items-center justify-between px-6">
					<div>
						<h1 className="text-lg font-semibold text-foreground tracking-tight">
							{intl.formatMessage({
								id: 'activity.title',
								defaultMessage: 'Activity Log',
							})}
						</h1>
						<p className="text-xs text-muted-foreground">
							{intl.formatMessage({
								id: 'activity.auditSubtitle',
								defaultMessage: 'Audit trail of all user actions.',
							})}{' '}
							{data?.total !== undefined
								? intl.formatMessage(
										{
											id: 'activity.recordsTotal',
											defaultMessage:
												'{count, plural, one {# record total.} other {# records total.}}',
										},
										{ count: data.total },
									)
								: ''}
						</p>
					</div>
				</div>
			</PageHeader>

			{/* Main Workspace */}
			<div className="flex flex-1 flex-col overflow-hidden bg-muted/50">
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
									<Activity className="mx-auto mb-3 size-10 text-muted-foreground/40" />
									<p className="text-sm text-muted-foreground">
										{intl.formatMessage({
											id: 'activity.noRecordsFound',
											defaultMessage: 'No activity records found',
										})}
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
