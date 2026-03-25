import { type ColumnDef } from '@tanstack/react-table'

import type { DataTableLinkColumn } from '../types'

export function createLinkColumn<TData>(column: DataTableLinkColumn<TData>): ColumnDef<TData> {
  return {
    id: column.accessorKey as string,
    accessorKey: column.accessorKey,
    header: column.header,
    enableSorting: column.enableSorting ?? true,
    enableHiding: column.enableHiding ?? true,
    cell: ({ row }) => {
      const rawValue = row.getValue(column.accessorKey as string)
      const url = String(rawValue ?? '')

      if (column.format) {
        return column.format(rawValue, row.original)
      }

      if (!url || url === '') {
        return <span className="text-muted-foreground">-</span>
      }

      const label =
        typeof column.linkConfig?.label === 'function'
          ? column.linkConfig.label(url, row.original)
          : (column.linkConfig?.label ?? url)

      return (
        <a
          href={url}
          target={column.linkConfig?.target ?? '_blank'}
          rel={column.linkConfig?.rel ?? 'noopener noreferrer'}
          className={column.linkConfig?.className ?? 'text-primary hover:underline'}
        >
          {label}
        </a>
      )
    },
  }
}
