import { IconCircleCheckFilled, IconLoader } from '@tabler/icons-react'
import { type ColumnDef } from '@tanstack/react-table'

import { Badge } from '../../../atoms/badge'
import type { DataTableStatusColumn } from '../types'

export function createStatusColumn<TData>(column: DataTableStatusColumn<TData>): ColumnDef<TData> {
  return {
    id: column.accessorKey as string,
    accessorKey: column.accessorKey,
    header: column.header,
    enableSorting: column.enableSorting ?? false,
    enableHiding: column.enableHiding ?? true,
    cell: ({ row }) => {
      const rawValue = row.getValue(column.accessorKey as string)
      const value = rawValue ?? ''
      const positives = column.statusConfig?.positiveValues ?? ['Done', 'Completed']
      const isPositive = positives.includes(rawValue as string | boolean | number)
      const label = column.statusConfig?.labels?.[String(rawValue)] ?? String(value)
      return (
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {isPositive ? (
            <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
          ) : (
            <IconLoader className="animate-spin" />
          )}
          {label}
        </Badge>
      )
    },
  }
}
