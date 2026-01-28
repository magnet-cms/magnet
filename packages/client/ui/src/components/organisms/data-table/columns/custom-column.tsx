import { type ColumnDef } from '@tanstack/react-table'

import type { DataTableCustomColumn } from '../types'

export function createCustomColumn<TData>(column: DataTableCustomColumn<TData>): ColumnDef<TData> {
  return {
    id: (column.accessorKey as string) ?? column.header,
    accessorKey: column.accessorKey,
    header: column.header,
    enableSorting: column.enableSorting ?? false,
    enableHiding: column.enableHiding ?? true,
    cell: ({ row }) => column.cell(row),
  }
}
