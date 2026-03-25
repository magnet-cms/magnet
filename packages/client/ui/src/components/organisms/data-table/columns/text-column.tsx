import { type ColumnDef } from '@tanstack/react-table'

import type { DataTableTextColumn } from '../types'

export function createTextColumn<TData>(column: DataTableTextColumn<TData>): ColumnDef<TData> {
  return {
    id: column.accessorKey as string,
    accessorKey: column.accessorKey,
    header: column.header,
    enableSorting: column.enableSorting ?? true,
    enableHiding: column.enableHiding ?? true,
    cell: ({ row }) => {
      const rawValue = row.getValue(column.accessorKey as string)
      if (column.format) {
        return column.format(rawValue, row.original)
      }
      return <span>{String(rawValue ?? '')}</span>
    },
  }
}
