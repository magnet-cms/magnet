import { PageHeader, useAdapter } from '@magnet-cms/admin'
import {
	Badge,
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
} from '@magnet-cms/ui/components'
import { useEffect, useState } from 'react'

interface Subscription {
	id: string
	polarSubscriptionId: string
	customerId: string
	productId: string
	status: string
	amount?: number
	currency?: string
	currentPeriodStart: string
	currentPeriodEnd: string
	cancelAtPeriodEnd: boolean
}

function getStatusVariant(
	status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
	switch (status) {
		case 'active':
		case 'trialing':
			return 'default'
		case 'past_due':
		case 'unpaid':
			return 'destructive'
		case 'canceled':
		case 'revoked':
			return 'secondary'
		default:
			return 'outline'
	}
}

const SubscriptionsPage = () => {
	const adapter = useAdapter()
	const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
	const [statusFilter, setStatusFilter] = useState<string>('all')
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		async function fetch() {
			try {
				const data = await adapter.request<Subscription[]>(
					'/polar/admin/subscriptions',
				)
				setSubscriptions(data)
			} catch (error) {
				console.error('[Polar] Failed to fetch subscriptions:', error)
			} finally {
				setLoading(false)
			}
		}
		fetch()
	}, [adapter])

	const filtered =
		statusFilter === 'all'
			? subscriptions
			: subscriptions.filter((s) => s.status === statusFilter)

	const handleCancel = async (polarSubscriptionId: string) => {
		try {
			await adapter.request(
				`/polar/admin/subscriptions/${polarSubscriptionId}/cancel`,
				{ method: 'POST' },
			)
			setSubscriptions((prev) =>
				prev.map((s) =>
					s.polarSubscriptionId === polarSubscriptionId
						? { ...s, status: 'revoked' }
						: s,
				),
			)
		} catch (error) {
			console.error('[Polar] Failed to cancel subscription:', error)
		}
	}

	const columns: DataTableColumn<Subscription>[] = [
		{
			type: 'text',
			header: 'Customer',
			accessorKey: 'customerId',
			format: (value) => (
				<span className="font-mono text-sm">{value as string}</span>
			),
		},
		{
			type: 'text',
			header: 'Product',
			accessorKey: 'productId',
			format: (value) => (
				<span className="font-mono text-sm">{value as string}</span>
			),
		},
		{
			type: 'custom',
			header: 'Status',
			cell: (row) => (
				<Badge variant={getStatusVariant(row.original.status)}>
					{row.original.status}
					{row.original.cancelAtPeriodEnd && ' (canceling)'}
				</Badge>
			),
		},
		{
			type: 'custom',
			header: 'Period',
			cell: (row) => (
				<span className="text-sm text-muted-foreground">
					{new Date(row.original.currentPeriodStart).toLocaleDateString()}
					{' — '}
					{new Date(row.original.currentPeriodEnd).toLocaleDateString()}
				</span>
			),
		},
		{
			type: 'custom',
			header: 'Actions',
			cell: (row) =>
				row.original.status === 'active' && !row.original.cancelAtPeriodEnd ? (
					<Button
						variant="destructive"
						size="sm"
						onClick={() => handleCancel(row.original.polarSubscriptionId)}
					>
						Revoke
					</Button>
				) : null,
		},
	]

	const renderToolbar = () => (
		<div className="px-6 py-4 flex flex-col sm:flex-row gap-3 items-center justify-between flex-none border-b border-border bg-background">
			<div className="max-w-[200px]">
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger>
						<SelectValue placeholder="Filter by status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Statuses</SelectItem>
						<SelectItem value="active">Active</SelectItem>
						<SelectItem value="trialing">Trialing</SelectItem>
						<SelectItem value="past_due">Past Due</SelectItem>
						<SelectItem value="canceled">Canceled</SelectItem>
						<SelectItem value="revoked">Revoked</SelectItem>
						<SelectItem value="unpaid">Unpaid</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
				Clear Filters
			</Button>
		</div>
	)

	const renderPagination = (table: DataTableRenderContext<Subscription>) => {
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

	if (loading) {
		return (
			<div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
				<PageHeader title="Subscriptions" />
				<div className="flex-1 p-6">
					<Skeleton className="h-96 w-full" />
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
			<PageHeader
				title="Subscriptions"
				description={`${subscriptions.length} subscription(s) total.`}
			/>
			<div className="flex-1 flex flex-col overflow-hidden bg-muted/50">
				<div className="flex-1 overflow-hidden relative">
					<div className="absolute inset-0 overflow-auto">
						<DataTable
							data={filtered}
							columns={columns}
							getRowId={(row) => row.id}
							renderToolbar={renderToolbar}
							renderPagination={renderPagination}
							enablePagination
							pageSizeOptions={[10, 20, 50]}
							initialPagination={{ pageIndex: 0, pageSize: 10 }}
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

export default SubscriptionsPage
