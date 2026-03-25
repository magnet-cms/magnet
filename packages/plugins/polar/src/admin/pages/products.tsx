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
import { RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface Product {
  id: string
  polarProductId: string
  name: string
  description?: string
  isRecurring: boolean
  isArchived: boolean
}

const ProductsPage = () => {
  const adapter = useAdapter()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const fetchProducts = useCallback(async () => {
    try {
      const data = await adapter.request<Product[]>('/polar/admin/products')
      setProducts(data)
    } catch (error) {
      console.error('[Polar] Failed to fetch products:', error)
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
      await adapter.request('/polar/admin/sync-products', { method: 'POST' })
      await fetchProducts()
    } catch (error) {
      console.error('[Polar] Failed to sync products:', error)
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
        <div className="text-sm font-medium text-foreground">{value as string}</div>
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
      header: 'Type',
      cell: (row) => (
        <Badge variant="outline">{row.original.isRecurring ? 'Recurring' : 'One-time'}</Badge>
      ),
    },
    {
      type: 'custom',
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.original.isArchived ? 'secondary' : 'default'}>
          {row.original.isArchived ? 'Archived' : 'Active'}
        </Badge>
      ),
    },
  ]

  const renderToolbar = () => (
    <div className="px-6 py-4 flex flex-col sm:flex-row gap-3 items-center justify-between flex-none border-b border-border bg-background">
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
      <div className="flex-none px-6 py-4 border-t border-border bg-background flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{startRow}</span> to{' '}
          <span className="font-medium text-foreground">{endRow}</span> of{' '}
          <span className="font-medium text-foreground">{totalRows}</span> results
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
        <PageHeader title="Products" />
        <div className="flex-1 p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
      <PageHeader
        title="Products"
        description={`${products.length} product(s). Click "Sync from Polar" to import.`}
        actions={
          <Button onClick={handleSync} disabled={syncing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync from Polar
          </Button>
        }
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

export default ProductsPage
