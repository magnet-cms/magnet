import { PageHeader, useAdapter } from '@magnet-cms/admin'
import {
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
  type DataTableRenderContext,
  Skeleton,
} from '@magnet-cms/ui/components'
import { useEffect, useState } from 'react'

interface Order {
  id: string
  polarOrderId: string
  customerId: string
  productId: string
  status: string
  totalAmount: number
  currency: string
  billingReason?: string
  createdAt: string
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'paid':
      return 'default'
    case 'refunded':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function formatCurrency(cents: number, currency: string): string {
  return `${currency.toUpperCase()} $${(cents / 100).toFixed(2)}`
}

const OrdersPage = () => {
  const adapter = useAdapter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const data = await adapter.request<Order[]>('/polar/admin/orders')
        setOrders(data)
      } catch (error) {
        console.error('[Polar] Failed to fetch orders:', error)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [adapter])

  const columns: DataTableColumn<Order>[] = [
    {
      type: 'text',
      header: 'Order ID',
      accessorKey: 'polarOrderId',
      format: (value) => (
        <span className="font-mono text-sm">{(value as string).slice(0, 12)}...</span>
      ),
    },
    {
      type: 'custom',
      header: 'Amount',
      cell: (row) => (
        <span className="font-medium">
          {formatCurrency(row.original.totalAmount, row.original.currency)}
        </span>
      ),
    },
    {
      type: 'custom',
      header: 'Status',
      cell: (row) => (
        <Badge variant={getStatusVariant(row.original.status)}>{row.original.status}</Badge>
      ),
    },
    {
      type: 'text',
      header: 'Customer',
      accessorKey: 'customerId',
      format: (value) => <span className="font-mono text-sm">{value as string}</span>,
    },
    {
      type: 'text',
      header: 'Reason',
      accessorKey: 'billingReason',
      format: (value) => (
        <span className="text-sm text-muted-foreground">{(value as string) ?? '—'}</span>
      ),
    },
    {
      type: 'text',
      header: 'Date',
      accessorKey: 'createdAt',
      format: (value) => new Date(value as string).toLocaleDateString(),
    },
  ]

  const renderPagination = (table: DataTableRenderContext<Order>) => {
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
        <PageHeader title="Orders" />
        <div className="flex-1 p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
      <PageHeader title="Orders" description={`${orders.length} order(s) total.`} />
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/50">
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-auto">
            <DataTable
              data={orders}
              columns={columns}
              getRowId={(row) => row.id}
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

export default OrdersPage
