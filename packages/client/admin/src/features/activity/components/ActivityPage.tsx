'use client'

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
import {
	Activity,
	FilePen,
	Key,
	LogIn,
	LogOut,
	Plus,
	Search,
	Send,
	Settings,
	Trash2,
	Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type {
	ActivityRecord,
	ActivitySearchParams,
} from '~/core/adapters/types'
import { PageHeader } from '~/features/shared'
import { useActivitySearch } from '~/hooks/useActivity'

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

const ACTION_OPTIONS = [
	{ label: 'All Actions', value: '' },
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
	{ label: 'All Types', value: '' },
	{ label: 'Content', value: 'content' },
	{ label: 'User', value: 'user' },
	{ label: 'Settings', value: 'settings' },
	{ label: 'API Key', value: 'api_key' },
]

const PAGE_SIZE = 20

export function ActivityPage() {
	const [filters, setFilters] = useState<ActivitySearchParams>({
		limit: PAGE_SIZE,
		offset: 0,
	})
	const [entityTypeFilter, setEntityTypeFilter] = useState('')
	const [actionFilter, setActionFilter] = useState('')
	const [userIdFilter, setUserIdFilter] = useState('')
	const [allItems, setAllItems] = useState<ActivityRecord[]>([])

	const searchParams: ActivitySearchParams = {
		...filters,
		entityType: entityTypeFilter || undefined,
		action: actionFilter || undefined,
		userId: userIdFilter || undefined,
	}

	const { data, isLoading } = useActivitySearch(searchParams)

	// Accumulate items: reset on filter change (offset=0), append on load more
	useEffect(() => {
		if (!data) return
		if ((filters.offset ?? 0) === 0) {
			setAllItems(data.items)
		} else {
			setAllItems((prev) => [...prev, ...data.items])
		}
	}, [data, filters.offset])

	const handleApplyFilters = () => {
		setAllItems([])
		setFilters((prev) => ({ ...prev, offset: 0 }))
	}

	const handleLoadMore = () => {
		setFilters((prev) => ({
			...prev,
			offset: (prev.offset ?? 0) + PAGE_SIZE,
		}))
	}

	const hasMore = data
		? (data?.total ?? allItems.length > (filters.offset ?? 0) + PAGE_SIZE)
		: false

	return (
		<div className="flex-1 flex flex-col min-w-0 bg-white h-full relative">
			<PageHeader>
				<div className="px-8 py-6 flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-medium text-gray-900 tracking-tight">
							Activity Log
						</h1>
						<p className="mt-1 text-sm text-gray-500">
							Audit trail of all user actions
						</p>
					</div>
				</div>
			</PageHeader>

			<div className="flex-1 overflow-y-auto bg-gray-50/50 p-8">
				{/* Filters */}
				<div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-end">
					<div className="flex-1 min-w-[160px]">
						<span className="text-xs font-medium text-gray-600 mb-1 block">
							Action Type
						</span>
						<Select value={actionFilter} onValueChange={setActionFilter}>
							<SelectTrigger className="h-9 text-sm">
								<SelectValue placeholder="All Actions" />
							</SelectTrigger>
							<SelectContent>
								{ACTION_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex-1 min-w-[160px]">
						<span className="text-xs font-medium text-gray-600 mb-1 block">
							Entity Type
						</span>
						<Select
							value={entityTypeFilter}
							onValueChange={setEntityTypeFilter}
						>
							<SelectTrigger className="h-9 text-sm">
								<SelectValue placeholder="All Types" />
							</SelectTrigger>
							<SelectContent>
								{ENTITY_TYPE_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex-1 min-w-[160px]">
						<span className="text-xs font-medium text-gray-600 mb-1 block">
							User ID
						</span>
						<Input
							className="h-9 text-sm"
							placeholder="Filter by user..."
							value={userIdFilter}
							onChange={(e) => setUserIdFilter(e.target.value)}
						/>
					</div>

					<Button size="sm" onClick={handleApplyFilters}>
						<Search className="w-4 h-4" />
						Filter
					</Button>
				</div>

				{/* Results */}
				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					{isLoading ? (
						<div className="divide-y divide-gray-100">
							{Array.from({ length: 5 }).map((_, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
								<div key={i} className="p-4 flex items-center gap-4">
									<Skeleton className="w-8 h-8 rounded-full" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-4 w-48" />
										<Skeleton className="h-3 w-32" />
									</div>
									<Skeleton className="h-3 w-16" />
								</div>
							))}
						</div>
					) : allItems.length === 0 && !isLoading ? (
						<div className="py-16 text-center">
							<Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
							<p className="text-sm text-gray-500">No activity records found</p>
						</div>
					) : (
						<>
							<ul className="divide-y divide-gray-100">
								{allItems.map((record) => {
									const Icon = getActionIcon(record.action)
									return (
										<li
											key={record.id}
											className="p-4 flex items-start gap-4 hover:bg-gray-50/50"
										>
											<div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
												<Icon className="w-4 h-4 text-gray-600" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium text-gray-900">
													{record.action}
												</p>
												<p className="text-xs text-gray-500 mt-0.5 truncate">
													{record.entityType}
													{record.entityId ? ` · ${record.entityId}` : ''}
													{record.userId ? ` · by ${record.userId}` : ''}
												</p>
											</div>
											<span className="text-xs text-gray-400 shrink-0">
												{formatRelativeTime(record.timestamp)}
											</span>
										</li>
									)
								})}
							</ul>
							{hasMore && (
								<div className="p-4 text-center border-t border-gray-100">
									<Button variant="outline" size="sm" onClick={handleLoadMore}>
										Load more
									</Button>
								</div>
							)}
							<div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100">
								<p className="text-xs text-gray-500">
									Showing{' '}
									{Math.min(
										(filters.offset ?? 0) + PAGE_SIZE,
										data?.total ?? allItems.length,
									)}{' '}
									of {data?.total ?? allItems.length} records
								</p>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	)
}
