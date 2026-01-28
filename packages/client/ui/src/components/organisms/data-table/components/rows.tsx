'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type Row, flexRender } from '@tanstack/react-table'

import { cn } from '../../../../lib/utils'
import { TableCell, TableRow } from '../../../atoms/table'
import type { DataTableVariant } from '../types'

type DraggableRowProps<TData> = {
  row: Row<TData>
  variant?: DataTableVariant
}

type StaticRowProps<TData> = {
  row: Row<TData>
  variant?: DataTableVariant
}

export function DraggableRow<TData>({ row, variant = 'default' }: DraggableRowProps<TData>) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.id,
  })

  const isContentManagerVariant = variant === 'content-manager'

  return (
    <TableRow
      data-state={row.getIsSelected() && 'selected'}
      data-dragging={isDragging}
      ref={setNodeRef}
      className={cn(
        'relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80',
        isContentManagerVariant && 'table-row-hover transition-colors group [&:hover_td]:bg-gray-50'
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={cn(isContentManagerVariant && 'px-3 py-4 whitespace-nowrap')}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

export function StaticRow<TData>({ row, variant = 'default' }: StaticRowProps<TData>) {
  const isContentManagerVariant = variant === 'content-manager'

  return (
    <TableRow
      data-state={row.getIsSelected() && 'selected'}
      className={cn(
        isContentManagerVariant && 'table-row-hover transition-colors group [&:hover_td]:bg-gray-50'
      )}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={cn(isContentManagerVariant && 'px-3 py-4 whitespace-nowrap')}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}
