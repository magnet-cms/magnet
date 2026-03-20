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

interface Payment {
	id: string
	stripePaymentIntentId: string
	customerId: string
	amount: number
	currency: string
	status: string
	receiptUrl?: string
	invoiceId?: string
	createdAt: string
}

function formatCurrency(cents: number, currency: string): string {
	return `${currency.toUpperCase()} ${(cents / 100).toFixed(2)}`
}

function getStatusVariant(
	status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
	switch (status) {
		case 'succeeded':
			return 'default'
		case 'failed':
			return 'destructive'
		case 'refunded':
			return 'secondary'
		default:
			return 'outline'
	}
}

const PaymentsPage = () => {
	const adapter = useAdapter()
	const [payments, setPayments] = useState<Payment[]>([])
	const [statusFilter, setStatusFilter] = useState<string>('all')
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		async function fetch() {
			try {
				const data = await adapter.request<Payment[]>('/stripe/admin/payments')
				setPayments(data)
			} catch (error) {
				console.error('[Stripe] Failed to fetch payments:', error)
			} finally {
				setLoading(false)
			}
		}
		fetch()
	}, [adapter])

	const filtered =
		statusFilter === 'all'
			? payments
			: payments.filter((p) => p.status === statusFilter)

	const handleRefund = async (paymentIntentId: string) => {
		try {
			await adapter.request(
				`/stripe/admin/payments/${paymentIntentId}/refund`,
				{ method: 'POST' },
			)
			setPayments((prev) =>
				prev.map((p) =>
					p.stripePaymentIntentId === paymentIntentId
						? { ...p, status: 'refunded' }
						: p,
				),
			)
		} catch (error) {
			console.error('[Stripe] Failed to refund payment:', error)
		}
	}

	const columns: DataTableColumn<Payment>[] = [
		{
			type: 'custom',
			header: 'Amount',
			cell: (row) => (
				<span className="font-medium">
					{formatCurrency(row.original.amount, row.original.currency)}
				</span>
			),
		},
		{
			type: 'custom',
			header: 'Status',
			cell: (row) => (
				<Badge variant={getStatusVariant(row.original.status)}>
					{row.original.status}
				</Badge>
			),
		},
		{
			type: 'text',
			header: 'Customer',
			accessorKey: 'customerId',
			format: (value) => (
				<span className="font-mono text-sm text-muted-foreground">
					{value as string}
				</span>
			),
		},
		{
			type: 'text',
			header: 'Date',
			accessorKey: 'createdAt',
			format: (value) => (
				<span className="text-muted-foreground">
					{new Date(value as string).toLocaleDateString()}
				</span>
			),
		},
		{
			type: 'custom',
			header: 'Actions',
			cell: (row) =>
				row.original.status === 'succeeded' ? (
					<Button
						variant="outline"
						size="sm"
						onClick={() => handleRefund(row.original.stripePaymentIntentId)}
					>
						Refund
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
						<SelectItem value="succeeded">Succeeded</SelectItem>
						<SelectItem value="failed">Failed</SelectItem>
						<SelectItem value="refunded">Refunded</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
				Clear Filters
			</Button>
		</div>
	)

	const renderPagination = (table: DataTableRenderContext<Payment>) => {
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
				<PageHeader title="Payments" />
				<div className="flex-1 p-6">
					<Skeleton className="h-96 w-full" />
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
			<PageHeader
				title="Payments"
				description={`${payments.length} payment(s) total.`}
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

export default PaymentsPage
