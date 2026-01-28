import { type ColumnDef } from '@tanstack/react-table'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../atoms/select'
import type { DataTableSelectorColumn } from '../types'

export function createSelectorColumn<TData>(
  column: DataTableSelectorColumn<TData>
): ColumnDef<TData> {
  return {
    id: column.accessorKey as string,
    accessorKey: column.accessorKey,
    header: column.header,
    enableSorting: column.enableSorting ?? false,
    enableHiding: column.enableHiding ?? true,
    cell: ({ row }) => {
      const rawValue = row.getValue(column.accessorKey as string)
      const stringValue = rawValue == null ? undefined : String(rawValue)

      return (
        <Select
          value={stringValue}
          onValueChange={(next) => {
            column.onChange?.(next, row.original)
          }}
        >
          <SelectTrigger className="w-38 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate">
            <SelectValue placeholder={column.placeholder} />
          </SelectTrigger>
          <SelectContent align="end">
            {column.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    },
  }
}
