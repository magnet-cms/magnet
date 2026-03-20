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
import { Copy, Key } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '~/features/shared'
import {
	type ApiKey as ApiApiKey,
	type CreateApiKeyData,
	useApiKeyCreate,
	useApiKeyList,
	useApiKeyRevoke,
} from '~/hooks/useApiKeys'
import { useAppIntl } from '~/i18n'

import { CreateApiKeyDrawer } from './CreateApiKeyDrawer'

interface ApiKey {
	id: string
	name: string
	key: string
	status: 'Active' | 'Revoked' | 'Expired'
	createdAt: string
	lastUsed: string
	expiresAt: string | null
}

const statusColors: Record<string, { bg: string; text: string; ring: string }> =
	{
		Active: {
			bg: 'bg-green-50 dark:bg-green-950/40',
			text: 'text-green-700 dark:text-green-400',
			ring: 'ring-green-600/20 dark:ring-green-500/30',
		},
		Revoked: {
			bg: 'bg-red-50 dark:bg-red-950/40',
			text: 'text-red-700 dark:text-red-400',
			ring: 'ring-red-600/20 dark:ring-red-500/30',
		},
		Expired: {
			bg: 'bg-muted',
			text: 'text-muted-foreground',
			ring: 'ring-border',
		},
	}

// Helper function to mask API key
function maskApiKey(key: string): string {
	if (key.length <= 12) return key
	const prefix = key.substring(0, 8)
	const suffix = key.substring(key.length - 4)
	const masked = '*'.repeat(Math.max(0, key.length - 12))
	return `${prefix}${masked}${suffix}`
}

// Format relative time
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

// Transform API key from API to display format
function transformApiKey(apiKey: ApiApiKey): ApiKey {
	// Determine status
	let status: ApiKey['status'] = 'Active'
	if (!apiKey.enabled) {
		status = 'Revoked'
	} else if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
		status = 'Expired'
	}

	return {
		id: apiKey.id,
		name: apiKey.name,
		key: apiKey.keyPrefix,
		status,
		createdAt: new Date(apiKey.createdAt).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		}),
		lastUsed: formatRelativeTime(apiKey.lastUsedAt),
		expiresAt: apiKey.expiresAt
			? new Date(apiKey.expiresAt).toLocaleDateString(undefined, {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
				})
			: null,
	}
}

export function ApiKeysListingPage() {
	const intl = useAppIntl()
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState<string>('All Status')
	const [createApiKeyModalOpen, setCreateApiKeyModalOpen] = useState(false)
	const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)

	// API hooks
	const { data: apiKeysData, isLoading, error, refetch } = useApiKeyList()
	const { mutate: createApiKey } = useApiKeyCreate()
	const { mutate: revokeApiKey } = useApiKeyRevoke()

	// Transform API keys to display format
	const apiKeys: ApiKey[] = useMemo(() => {
		if (!apiKeysData) return []
		return apiKeysData.map(transformApiKey)
	}, [apiKeysData])

	const handleCreateApiKey = (data: {
		name: string
		expiresAt: string | null
	}) => {
		const createData: CreateApiKeyData = {
			name: data.name,
			expiresAt: data.expiresAt || undefined,
		}

		createApiKey(createData, {
			onSuccess: (response) => {
				toast.success(
					intl.formatMessage({
						id: 'apiKeys.createSuccess',
						defaultMessage: 'API key created successfully',
					}),
				)
				// Show the plain key - it's only returned once
				if (response.plainKey) {
					setNewlyCreatedKey(response.plainKey)
					// Copy to clipboard
					navigator.clipboard.writeText(response.plainKey)
					toast.info(
						"Secret key copied to clipboard. Save it now - it won't be shown again!",
					)
				}
				setCreateApiKeyModalOpen(false)
				refetch()
			},
			onError: (err) => {
				toast.error(
					err.message ||
						intl.formatMessage({
							id: 'apiKeys.createError',
							defaultMessage: 'Failed to create API key',
						}),
				)
			},
		})
	}

	const handleCopyKey = (key: string) => {
		navigator.clipboard.writeText(key)
		toast.success(
			intl.formatMessage({
				id: 'apiKeys.copySuccess',
				defaultMessage: 'API key copied to clipboard',
			}),
		)
	}

	const handleRevokeKey = (id: string) => {
		if (
			!window.confirm(
				'Are you sure you want to revoke this API key? This cannot be undone.',
			)
		) {
			return
		}

		revokeApiKey(id, {
			onSuccess: () => {
				toast.success(
					intl.formatMessage({
						id: 'apiKeys.revokeSuccess',
						defaultMessage: 'API key revoked successfully',
					}),
				)
				refetch()
			},
			onError: (err) => {
				toast.error(
					err.message ||
						intl.formatMessage({
							id: 'apiKeys.revokeError',
							defaultMessage: 'Failed to revoke API key',
						}),
				)
			},
		})
	}

	const columns: DataTableColumn<ApiKey>[] = [
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
			type: 'custom',
			header: 'Key',
			cell: (row) => {
				const maskedKey = maskApiKey(row.original.key)
				return (
					<div className="flex items-center gap-2">
						<code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
							{maskedKey}
						</code>
						<Button
							variant="ghost"
							size="sm"
							className="h-6 w-6 p-0"
							onClick={() => handleCopyKey(row.original.key)}
							title="Copy full key"
						>
							<Copy className="w-3 h-3" />
						</Button>
					</div>
				)
			},
		},
		{
			type: 'custom',
			header: 'Status',
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
						{status}
					</span>
				)
			},
		},
		{
			type: 'text',
			header: 'Created',
			accessorKey: 'createdAt',
			format: (value) => (
				<span className="text-sm text-muted-foreground">{value as string}</span>
			),
		},
		{
			type: 'text',
			header: 'Last Used',
			accessorKey: 'lastUsed',
			format: (value) => (
				<span className="text-sm text-muted-foreground">{value as string}</span>
			),
		},
		{
			type: 'custom',
			header: 'Expires',
			cell: (row) => {
				const expiresAt = row.original.expiresAt
				return (
					<span className="text-sm text-muted-foreground">
						{expiresAt || 'Never'}
					</span>
				)
			},
		},
	]

	const filteredData = apiKeys.filter((key) => {
		const matchesSearch =
			key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			key.key.toLowerCase().includes(searchQuery.toLowerCase())
		const matchesStatus =
			statusFilter === 'All Status' || key.status === statusFilter
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
						placeholder="Search API keys..."
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
							<SelectItem value="All Status">All Status</SelectItem>
							<SelectItem value="Active">Active</SelectItem>
							<SelectItem value="Revoked">Revoked</SelectItem>
							<SelectItem value="Expired">Expired</SelectItem>
						</SelectContent>
					</Select>

					<div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/50">
						<Button
							variant="ghost"
							size="sm"
							className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
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

	const renderPagination = (table: DataTableRenderContext<ApiKey>) => {
		const { pageIndex, pageSize } = table.getState().pagination
		const totalRows = table.getFilteredRowModel().rows.length
		const startRow = pageIndex * pageSize + 1
		const endRow = Math.min((pageIndex + 1) * pageSize, totalRows)

		return (
			<div className="flex-none px-6 py-4 border-t border-border bg-background flex items-center justify-between">
				<div className="text-xs text-muted-foreground">
					Showing{' '}
					<span className="font-medium text-foreground">{startRow}</span> to{' '}
					<span className="font-medium text-foreground">{endRow}</span> of{' '}
					<span className="font-medium text-foreground">{totalRows}</span>{' '}
					results
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground/50 cursor-not-allowed bg-muted"
						disabled={!table.getCanPreviousPage()}
						onClick={() => table.previousPage()}
					>
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="px-3 py-1.5 rounded-md text-xs font-medium text-foreground hover:bg-muted transition-colors"
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
			<div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
				<PageHeader>
					<div className="h-16 flex items-center justify-between px-6">
						<div>
							<Skeleton className="h-6 w-24 mb-1" />
							<Skeleton className="h-4 w-64" />
						</div>
						<Skeleton className="h-9 w-32" />
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
								API Keys
							</h1>
							<p className="text-xs text-muted-foreground">
								Manage API keys for accessing your application.
							</p>
						</div>
					</div>
				</PageHeader>
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center">
						<p className="text-muted-foreground mb-4">
							{error.message || 'Failed to load API keys'}
						</p>
						<Button onClick={() => refetch()}>Retry</Button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
			{/* Newly created key notification */}
			{newlyCreatedKey && (
				<div className="border-b border-amber-200 bg-amber-50 px-6 py-3 dark:border-amber-800 dark:bg-amber-950/40">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-amber-800 dark:text-amber-200">
								New API Key Created
							</p>
							<code className="mt-1 inline-block rounded bg-amber-100 px-2 py-1 font-mono text-xs text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
								{newlyCreatedKey}
							</code>
							<p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
								Copy this key now - it won&apos;t be shown again!
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									navigator.clipboard.writeText(newlyCreatedKey)
									toast.success('Copied!')
								}}
							>
								<Copy className="w-3 h-3 mr-1" />
								Copy
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setNewlyCreatedKey(null)}
							>
								Dismiss
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Header */}
			<PageHeader>
				{/* Toolbar: Title & Actions */}
				<div className="h-16 flex items-center justify-between px-6">
					{/* Left: Title */}
					<div>
						<h1 className="text-lg font-semibold text-foreground tracking-tight">
							API Keys
						</h1>
						<p className="text-xs text-muted-foreground">
							Manage API keys for accessing your application. {apiKeys.length}{' '}
							key(s) total.
						</p>
					</div>

					{/* Right: Actions */}
					<div className="flex items-center gap-3">
						<Button size="sm" onClick={() => setCreateApiKeyModalOpen(true)}>
							<Key className="w-3.5 h-3.5 mr-2" />
							Create API Key
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
											label: 'Copy Key',
											onSelect: (row) => {
												handleCopyKey(row.key)
											},
										},
										{
											label: 'Revoke',
											onSelect: (row) => {
												if (row.status === 'Active') {
													handleRevokeKey(row.id)
												}
											},
											destructive: true,
											disabled: (row) => row.status !== 'Active',
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

			<CreateApiKeyDrawer
				open={createApiKeyModalOpen}
				onOpenChange={setCreateApiKeyModalOpen}
				onCreate={handleCreateApiKey}
			/>
		</div>
	)
}
