import { type ColumnDef } from '@tanstack/react-table'

import { Input } from '../../../atoms/input'
import type { DataTableInputColumn } from '../types'

export function createInputColumn<TData>(column: DataTableInputColumn<TData>): ColumnDef<TData> {
  return {
    id: column.accessorKey as string,
    accessorKey: column.accessorKey,
    header: column.header,
    enableSorting: column.enableSorting ?? false,
    enableHiding: column.enableHiding ?? true,
    cell: ({ row }) => {
      const value = String(row.getValue(column.accessorKey as string) ?? '')

      return (
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            const formData = new FormData(event.currentTarget)
            const nextValue = String(formData.get('value') ?? '')
            await column.inputConfig?.onSubmit?.(nextValue, row.original)
          }}
        >
          <Input
            name="value"
            defaultValue={value}
            className={[
              'h-8 w-16 border-transparent bg-transparent shadow-none hover:bg-input/30 focus-visible:border focus-visible:bg-background dark:bg-transparent dark:hover:bg-input/30 dark:focus-visible:bg-input/30',
              column.inputConfig?.align === 'right' ? 'text-right' : 'text-left',
            ].join(' ')}
            placeholder={column.inputConfig?.placeholder}
          />
        </form>
      )
    },
  }
}
