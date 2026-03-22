'use client'

import {
	DataTable,
	type DataTableColumn,
	type DataTableRenderContext,
} from '@magnet-cms/ui'
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
import { useAppIntl } from '~/i18n'

import { PageHeader } from '~/features/shared'
import { useRoleList } from '~/hooks/useRoles'
import {
	type User as ApiUser,
	type CreateUserData,
	useUserCreate,
	useUserDelete,
	useUserList,
	useUserUpdate,
} from '~/hooks/useUsers'

import { CreateUserDrawer } from './CreateUserDrawer'

type UserStatusKey = 'Active' | 'Inactive' | 'Pending'

interface User {
	id: string
	name: string
	email: string
	role: string
	status: UserStatusKey
	lastLogin: string
	createdAt: string
}

const statusColors: Record<
	UserStatusKey,
	{ bg: string; text: string; ring: string }
> = {
	Active: {
		bg: 'bg-green-50 dark:bg-green-950/40',
		text: 'text-green-700 dark:text-green-400',
		ring: 'ring-green-600/20 dark:ring-green-500/30',
	},
	Inactive: {
		bg: 'bg-muted',
		text: 'text-muted-foreground',
		ring: 'ring-border',
	},
	Pending: {
		bg: 'bg-yellow-50 dark:bg-yellow-950/40',
		text: 'text-yellow-800 dark:text-yellow-300',
		ring: 'ring-yellow-600/20 dark:ring-yellow-500/30',
	},
}

function formatUserRelativeTime(
	date: Date,
	intl: ReturnType<typeof useAppIntl>,
): string {
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffMins = Math.floor(diffMs / 60000)
	const diffHours = Math.floor(diffMs / 3600000)
	const diffDays = Math.floor(diffMs / 86400000)

	if (diffMins < 1) {
		return intl.formatMessage({
			id: 'common.time.justNow',
			defaultMessage: 'Just now',
		})
	}
	if (diffMins < 60) {
		return intl.formatMessage(
			{
				id: 'common.time.minutesAgo',
				defaultMessage:
					'{count, plural, one {# minute ago} other {# minutes ago}}',
			},
			{ count: diffMins },
		)
	}
	if (diffHours < 24) {
		return intl.formatMessage(
			{
				id: 'common.time.hoursAgo',
				defaultMessage: '{count, plural, one {# hour ago} other {# hours ago}}',
			},
			{ count: diffHours },
		)
	}
	if (diffDays < 7) {
		return intl.formatMessage(
			{
				id: 'common.time.daysAgo',
				defaultMessage: '{count, plural, one {# day ago} other {# days ago}}',
			},
			{ count: diffDays },
		)
	}
	return date.toLocaleDateString()
}

// Transform API user to display user
function transformUser(
	apiUser: ApiUser,
	intl: ReturnType<typeof useAppIntl>,
): User {
	const status: UserStatusKey =
		apiUser.isActive === false
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
			? formatUserRelativeTime(new Date(apiUser.lastLogin), intl)
			: intl.formatMessage({
					id: 'contentManager.metadata.never',
					defaultMessage: 'Never',
				}),
		createdAt: apiUser.createdAt
			? new Date(apiUser.createdAt).toLocaleDateString(undefined, {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
				})
			: '-',
	}
}

function statusDisplayLabel(
	status: UserStatusKey,
	intl: ReturnType<typeof useAppIntl>,
): string {
	switch (status) {
		case 'Active':
			return intl.formatMessage({
				id: 'users.statusActive',
				defaultMessage: 'Active',
			})
		case 'Inactive':
			return intl.formatMessage({
				id: 'users.statusInactive',
				defaultMessage: 'Inactive',
			})
		case 'Pending':
			return intl.formatMessage({
				id: 'users.statusPending',
				defaultMessage: 'Pending',
			})
	}
}

export function UsersListingPage() {
	const intl = useAppIntl()
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState<string>('__all_status__')
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
		return usersData.users.map((u) => transformUser(u, intl))
	}, [usersData, intl])

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
		return roles
			.filter((role) => role.name)
			.map((role) => ({
				label: role.name.charAt(0).toUpperCase() + role.name.slice(1),
				value: role.name,
			}))
	}, [roles])

	const handleRoleChange = (userId: string, newRole: string) => {
		updateUser(
			{ id: userId, data: { role: newRole } },
			{
				onSuccess: () => {
					toast.success(
						intl.formatMessage({
							id: 'users.roleUpdatedSuccess',
							defaultMessage: 'User role updated',
						}),
					)
					refetch()
				},
				onError: (err) => {
					toast.error(
						err.message ||
							intl.formatMessage({
								id: 'users.roleUpdatedError',
								defaultMessage: 'Failed to update role',
							}),
					)
				},
			},
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
				toast.success(
					intl.formatMessage({
						id: 'users.createSuccess',
						defaultMessage: 'User created successfully',
					}),
				)
				setCreateUserModalOpen(false)
				refetch()
			},
			onError: (err) => {
				toast.error(
					err.message ||
						intl.formatMessage({
							id: 'users.createError',
							defaultMessage: 'Failed to create user',
						}),
				)
			},
		})
	}

	const handleDeleteUser = (userId: string) => {
		if (
			!window.confirm(
				intl.formatMessage({
					id: 'users.deleteConfirm',
					defaultMessage: 'Are you sure you want to delete this user?',
				}),
			)
		) {
			return
		}

		deleteUser(userId, {
			onSuccess: () => {
				toast.success(
					intl.formatMessage({
						id: 'users.deleteSuccess',
						defaultMessage: 'User deleted successfully',
					}),
				)
				refetch()
			},
			onError: (err) => {
				toast.error(
					err.message ||
						intl.formatMessage({
							id: 'users.deleteError',
							defaultMessage: 'Failed to delete user',
						}),
				)
			},
		})
	}

	const columns: DataTableColumn<User>[] = [
		{
			type: 'text',
			header: 'Name',
			accessorKey: 'name',
			format: (value) => (
				<div className="text-sm font-medium text-foreground">
					{value as string}
				</div>
			),
		},
		{
			type: 'text',
			header: intl.formatMessage({
				id: 'users.columnEmail',
				defaultMessage: 'Email',
			}),
			accessorKey: 'email',
			format: (value) => (
				<div className="text-sm text-muted-foreground">{value as string}</div>
			),
		},
		{
			type: 'selector',
			header: intl.formatMessage({
				id: 'users.columnRole',
				defaultMessage: 'Role',
			}),
			accessorKey: 'role',
			options: roleOptions,
			placeholder: intl.formatMessage({
				id: 'users.rolePlaceholder',
				defaultMessage: 'Select role',
			}),
			onChange: (value, row) => {
				handleRoleChange(row.id, value)
			},
		},
		{
			type: 'custom',
			header: intl.formatMessage({
				id: 'users.columnStatus',
				defaultMessage: 'Status',
			}),
			cell: (row) => {
				const status = row.original.status
				const colors = statusColors[status] ?? {
					bg: 'bg-muted',
					text: 'text-muted-foreground',
					ring: 'ring-border',
				}
				return (
					<span
						className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${colors.bg} ${colors.text} ${colors.ring}`}
					>
						{statusDisplayLabel(status, intl)}
					</span>
				)
			},
		},
		{
			type: 'text',
			header: intl.formatMessage({
				id: 'users.columnLastLogin',
				defaultMessage: 'Last Login',
			}),
			accessorKey: 'lastLogin',
			format: (value) => (
				<span className="text-sm text-muted-foreground">{value as string}</span>
			),
		},
		{
			type: 'text',
			header: intl.formatMessage({
				id: 'users.columnCreated',
				defaultMessage: 'Created',
			}),
			accessorKey: 'createdAt',
			format: (value) => (
				<span className="text-sm text-muted-foreground">{value as string}</span>
			),
		},
	]

	const filteredData = users.filter((user) => {
		const matchesSearch =
			user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			user.email.toLowerCase().includes(searchQuery.toLowerCase())
		const matchesStatus =
			statusFilter === '__all_status__' || user.status === statusFilter
		return matchesSearch && matchesStatus
	})

	const renderToolbar = () => {
		return (
			<div className="px-6 py-4 flex flex-col sm:flex-row gap-3 items-center justify-between flex-none border-b border-border bg-background">
				<div className="relative w-full sm:w-80">
					<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
						<svg
							className="text-muted-foreground"
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
						className="pl-9 pr-3 py-1.5 border border-input rounded-lg text-sm bg-muted/50 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring transition-all shadow-sm"
						placeholder={intl.formatMessage({
							id: 'users.searchPlaceholder',
							defaultMessage: 'Search users...',
						})}
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>

				<div className="flex items-center gap-3 w-full sm:w-auto">
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="appearance-none pl-3 pr-8 py-1.5 border border-input rounded-lg text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shadow-sm cursor-pointer min-w-[120px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="__all_status__">
								{intl.formatMessage({
									id: 'users.filterAllStatus',
									defaultMessage: 'All Status',
								})}
							</SelectItem>
							<SelectItem value="Active">
								{intl.formatMessage({
									id: 'users.statusActive',
									defaultMessage: 'Active',
								})}
							</SelectItem>
							<SelectItem value="Inactive">
								{intl.formatMessage({
									id: 'users.statusInactive',
									defaultMessage: 'Inactive',
								})}
							</SelectItem>
							<SelectItem value="Pending">
								{intl.formatMessage({
									id: 'users.statusPending',
									defaultMessage: 'Pending',
								})}
							</SelectItem>
						</SelectContent>
					</Select>

					<div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/50">
						<Button
							variant="ghost"
							size="sm"
							className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
							onClick={() => {
								setSearchQuery('')
								setStatusFilter('__all_status__')
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
	}

	const renderPagination = (table: DataTableRenderContext<User>) => {
		const { pageIndex, pageSize } = table.getState().pagination
		const totalRows = table.getFilteredRowModel().rows.length
		const startRow = pageIndex * pageSize + 1
		const endRow = Math.min((pageIndex + 1) * pageSize, totalRows)

		return (
			<div className="flex-none px-6 py-4 border-t border-border bg-background flex items-center justify-between">
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
						className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground/50 cursor-not-allowed bg-muted"
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
						className="px-3 py-1.5 rounded-md text-xs font-medium text-foreground hover:bg-muted transition-colors"
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

	// Loading state
	if (isLoading) {
		return (
			<div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
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
			<div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
				<PageHeader>
					<div className="h-16 flex items-center justify-between px-6">
						<div>
							<h1 className="text-lg font-semibold text-foreground tracking-tight">
								{intl.formatMessage({
									id: 'users.title',
									defaultMessage: 'Users',
								})}
							</h1>
							<p className="text-xs text-muted-foreground">
								{intl.formatMessage({
									id: 'users.subtitle',
									defaultMessage: 'Manage users and their roles.',
								})}
							</p>
						</div>
					</div>
				</PageHeader>
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center">
						<p className="text-muted-foreground mb-4">
							{error.message ||
								intl.formatMessage({
									id: 'users.loadFailed',
									defaultMessage: 'Failed to load users',
								})}
						</p>
						<Button onClick={() => refetch()}>
							{intl.formatMessage({
								id: 'common.actions.retry',
								defaultMessage: 'Retry',
							})}
						</Button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
			{/* Header */}
			<PageHeader>
				{/* Toolbar: Title & Actions */}
				<div className="h-16 flex items-center justify-between px-6">
					{/* Left: Title */}
					<div>
						<h1 className="text-lg font-semibold text-foreground tracking-tight">
							{intl.formatMessage({
								id: 'users.title',
								defaultMessage: 'Users',
							})}
						</h1>
						<p className="text-xs text-muted-foreground">
							{intl.formatMessage({
								id: 'users.subtitle',
								defaultMessage: 'Manage users and their roles.',
							})}{' '}
							{intl.formatMessage(
								{
									id: 'users.totalSummary',
									defaultMessage:
										'{count, plural, one {# user} other {# users}} total.',
								},
								{ count: usersData?.total ?? 0 },
							)}
						</p>
					</div>

					{/* Right: Actions */}
					<div className="flex items-center gap-3">
						<Button size="sm" onClick={() => setCreateUserModalOpen(true)}>
							{intl.formatMessage({
								id: 'users.createUser',
								defaultMessage: 'Create User',
							})}
						</Button>
					</div>
				</div>
			</PageHeader>

			{/* Main Workspace */}
			<div className="flex-1 flex flex-col overflow-hidden bg-muted/50">
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
											label: intl.formatMessage({
												id: 'common.actions.edit',
												defaultMessage: 'Edit',
											}),
											onSelect: () => {
												// Would open edit drawer
											},
										},
										{
											label: intl.formatMessage({
												id: 'common.actions.delete',
												defaultMessage: 'Delete',
											}),
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
