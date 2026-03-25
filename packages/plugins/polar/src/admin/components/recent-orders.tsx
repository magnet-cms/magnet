import { Badge, DataTable, type DataTableColumn } from '@magnet-cms/ui/components'

interface RecentOrder {
  id: string
  totalAmount: number
  currency: string
  status: string
  customerEmail: string
  createdAt: string
}

interface RecentOrdersProps {
  orders: RecentOrder[]
}

function formatCurrency(cents: number, currency: string): string {
  return `${currency.toUpperCase()} $${(cents / 100).toFixed(2)}`
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

const columns: DataTableColumn<RecentOrder>[] = [
  {
    type: 'text',
    header: 'Amount',
    accessorKey: 'totalAmount',
    format: (_value, row) => formatCurrency(row.totalAmount, row.currency),
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
    accessorKey: 'customerEmail',
    format: (value) => <span className="font-mono text-sm">{value as string}</span>,
  },
  {
    type: 'text',
    header: 'Date',
    accessorKey: 'createdAt',
    format: (value) => new Date(value as string).toLocaleDateString(),
  },
]

export function RecentOrders({ orders }: RecentOrdersProps) {
  return (
    <DataTable
      data={orders}
      columns={columns}
      getRowId={(row) => row.id}
      showCount={false}
      className="border rounded-lg"
      variant="content-manager"
    />
  )
}
