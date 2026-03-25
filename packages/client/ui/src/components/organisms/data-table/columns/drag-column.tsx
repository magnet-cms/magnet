import { type ColumnDef } from '@tanstack/react-table'

import { DragHandleCell } from '../components/drag-handle-cell'

export function createDragColumn<TData>(): ColumnDef<TData> {
  return {
    id: '__drag',
    header: () => null,
    cell: ({ row }) => <DragHandleCell id={row.id} />,
    enableSorting: false,
    enableHiding: false,
  }
}
