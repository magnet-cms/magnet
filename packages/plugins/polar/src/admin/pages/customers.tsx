import { PageHeader, useAdapter } from '@magnet-cms/admin'
import {
	Button,
	DataTable,
	type DataTableColumn,
	type DataTableRenderContext,
	Input,
	Skeleton,
} from '@magnet-cms/ui/components'
import { ExternalLink, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface Customer {
	id: string
	polarCustomerId: string
	email: string
	name?: string
	userId?: string
	createdAt: string
}

const CustomersPage = () => {
	const adapter = useAdapter()
	const [customers, setCustomers] = useState<Customer[]>([])
	const [search, setSearch] = useState('')
	const [loading, setLoading] = useState(true)

	const fetchCustomers = useCallback(async () => {
		try {
			const data = await adapter.request<Customer[]>('/polar/admin/customers')
			setCustomers(data)
		} catch (error) {
			console.error('[Polar] Failed to fetch customers:', error)
		} finally {
			setLoading(false)
		}
	}, [adapter])

	useEffect(() => {
		fetchCustomers()
	}, [fetchCustomers])

	const filtered = customers.filter(
		(c) =>
			c.email.toLowerCase().includes(search.toLowerCase()) ||
			(c.name ?? '').toLowerCase().includes(search.toLowerCase()),
	)

	const columns: DataTableColumn<Customer>[] = [
		{
			type: 'text',
			header: 'Name',
			accessorKey: 'name',
			format: (value) => (
				<div className="text-sm font-medium text-foreground">
					{(value as string) ?? '—'}
				</div>
			),
		},
		{
			type: 'text',
			header: 'Email',
			accessorKey: 'email',
		},
		{
			type: 'text',
			header: 'User ID',
			accessorKey: 'userId',
			format: (value) => (
				<span className="font-mono text-sm">{(value as string) ?? '—'}</span>
			),
		},
		{
			type: 'text',
			header: 'Created',
			accessorKey: 'createdAt',
			format: (value) => new Date(value as string).toLocaleDateString(),
		},
		{
			type: 'custom',
			header: 'Polar',
			cell: (row) => (
				<a
					href={`https://dashboard.polar.sh/customers/${row.original.polarCustomerId}`}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
				>
					<ExternalLink className="h-3 w-3" />
					View
				</a>
			),
		},
	]

	const renderToolbar = () => (
		<div className="px-6 py-4 flex flex-col sm:flex-row gap-3 items-center justify-between flex-none border-b border-border bg-background">
			<div className="relative w-full sm:w-80">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search customers..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="pl-9"
				/>
			</div>
			<Button variant="ghost" size="sm" onClick={() => setSearch('')}>
				Clear Filters
			</Button>
		</div>
	)

	const renderPagination = (table: DataTableRenderContext<Customer>) => {
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
				<PageHeader title="Customers" />
				<div className="flex-1 p-6">
					<Skeleton className="h-96 w-full" />
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
			<PageHeader
				title="Customers"
				description={`${customers.length} customer(s) total.`}
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

export default CustomersPage
