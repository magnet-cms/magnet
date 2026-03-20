import {
	Badge,
	DataTable,
	type DataTableColumn,
} from '@magnet-cms/ui/components'

interface Payment {
	id: string
	amount: number
	currency: string
	status: string
	customerEmail: string
	createdAt: string
}

interface RecentPaymentsProps {
	payments: Payment[]
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

export function RecentPayments({ payments }: RecentPaymentsProps) {
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
			accessorKey: 'customerEmail',
			format: (value) => (
				<span className="text-muted-foreground">{value as string}</span>
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
	]

	return (
		<>
			<DataTable
				data={payments}
				columns={columns}
				getRowId={(row) => row.id}
				enablePagination={false}
				showCount={false}
				variant="content-manager"
				renderEmpty={() => (
					<div className="p-6 text-center">
						<p className="text-sm text-muted-foreground">No payments yet.</p>
					</div>
				)}
			/>
		</>
	)
}
