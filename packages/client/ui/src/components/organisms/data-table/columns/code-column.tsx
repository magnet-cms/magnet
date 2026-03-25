import { type ColumnDef } from '@tanstack/react-table'

import { Badge } from '../../../atoms/badge'
import type { DataTableCodeColumn } from '../types'

export function createCodeColumn<TData>(column: DataTableCodeColumn<TData>): ColumnDef<TData> {
  return {
    id: column.accessorKey as string,
    accessorKey: column.accessorKey,
    header: column.header,
    enableSorting: column.enableSorting ?? true,
    enableHiding: column.enableHiding ?? true,
    cell: ({ row }) => {
      const rawValue = row.getValue(column.accessorKey as string)
      const content = column.format ? column.format(rawValue, row.original) : String(rawValue ?? '')
      return (
        <Badge variant="outline" className="text-muted-foreground px-1.5 font-mono text-xs">
          {content}
        </Badge>
      )
    },
  }
}
