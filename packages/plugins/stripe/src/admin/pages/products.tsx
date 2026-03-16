import { PageHeader, useAdapter } from '@magnet-cms/admin'
import {
	Badge,
	Button,
	DataTable,
	type DataTableColumn,
	type DataTableRenderContext,
	Input,
	Skeleton,
} from '@magnet-cms/ui/components'
import { ExternalLink, RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

const contentManagerStyles = `
  .table-row-hover:hover td {
    background-color: #F9FAFB;
  }
  .table-row-hover.group:hover td {
    background-color: #F9FAFB;
  }
`

interface Product {
	id: string
	stripeProductId: string
	name: string
	description?: string
	active: boolean
}

const ProductsPage = () => {
	const adapter = useAdapter()
	const [products, setProducts] = useState<Product[]>([])
	const [search, setSearch] = useState('')
	const [loading, setLoading] = useState(true)
	const [syncing, setSyncing] = useState(false)

	const fetchProducts = useCallback(async () => {
		try {
			const data = await adapter.request<Product[]>('/stripe/admin/products')
			setProducts(data)
		} catch (error) {
			console.error('[Stripe] Failed to fetch products:', error)
		} finally {
			setLoading(false)
		}
	}, [adapter])

	useEffect(() => {
		fetchProducts()
	}, [fetchProducts])

	const handleSync = async () => {
		setSyncing(true)
		try {
			await adapter.request('/stripe/admin/sync-products', {
				method: 'POST',
			})
			await fetchProducts()
		} catch (error) {
			console.error('[Stripe] Failed to sync products:', error)
		} finally {
			setSyncing(false)
		}
	}

	const filtered = products.filter(
		(p) =>
			p.name.toLowerCase().includes(search.toLowerCase()) ||
			(p.description ?? '').toLowerCase().includes(search.toLowerCase()),
	)

	const columns: DataTableColumn<Product>[] = [
		{
			type: 'text',
			header: 'Name',
			accessorKey: 'name',
			format: (value) => (
				<div className="text-sm font-medium text-gray-900">
					{value as string}
				</div>
			),
		},
		{
			type: 'text',
			header: 'Description',
			accessorKey: 'description',
			format: (value) => (
				<div className="text-sm text-muted-foreground max-w-[300px] truncate">
					{(value as string) ?? '—'}
				</div>
			),
		},
		{
			type: 'custom',
			header: 'Status',
			cell: (row) => (
				<Badge variant={row.original.active ? 'default' : 'secondary'}>
					{row.original.active ? 'Active' : 'Archived'}
				</Badge>
			),
		},
		{
			type: 'custom',
			header: 'Stripe',
			cell: (row) => (
				<a
					href={`https://dashboard.stripe.com/products/${row.original.stripeProductId}`}
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
		<div className="px-6 py-4 flex flex-col sm:flex-row gap-3 items-center justify-between flex-none bg-white border-b border-gray-200">
			<div className="relative w-full sm:w-80">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search products..."
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

	const renderPagination = (table: DataTableRenderContext<Product>) => {
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
			<div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
				<PageHeader title="Products" />
				<div className="flex-1 p-6">
					<Skeleton className="h-96 w-full" />
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
			<style>{contentManagerStyles}</style>
			<PageHeader
				title="Products"
				description={`${products.length} product(s). Click "Sync from Stripe" to import.`}
				actions={
					<Button onClick={handleSync} disabled={syncing} variant="outline">
						<RefreshCw
							className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`}
						/>
						Sync from Stripe
					</Button>
				}
			/>
			<div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
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

export default ProductsPage
