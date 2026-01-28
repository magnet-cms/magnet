import { type ColumnDef } from '@tanstack/react-table'

import { cn } from '../../../../lib/utils'
import { Checkbox } from '../../../atoms/checkbox'
import type { DataTableVariant } from '../types'

export function createSelectionColumn<TData>(variant?: DataTableVariant): ColumnDef<TData> {
  const isContentManagerVariant = variant === 'content-manager'

  return {
    id: '__select',
    header: ({ table }) => (
      <div
        className={cn(
          'flex items-center',
          isContentManagerVariant ? 'justify-start' : 'justify-center'
        )}
      >
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row, table }) => {
      const rowId = row.id
      const isSelected = table.getState().rowSelection[rowId] === true
      return (
        <div
          className={cn(
            'flex items-center',
            isContentManagerVariant ? 'justify-start' : 'justify-center'
          )}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => {
              row.toggleSelected(!!checked)
            }}
            aria-label="Select row"
          />
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  }
}
