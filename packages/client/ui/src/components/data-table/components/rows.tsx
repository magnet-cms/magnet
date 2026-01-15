'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type Row, flexRender } from '@tanstack/react-table'

import { TableCell, TableRow } from '../../ui/table'

type DraggableRowProps<TData> = {
	row: Row<TData>
}

type StaticRowProps<TData> = {
	row: Row<TData>
}

export function DraggableRow<TData>({ row }: DraggableRowProps<TData>) {
	const { transform, transition, setNodeRef, isDragging } = useSortable({
		id: row.id,
	})

	return (
		<TableRow
			data-state={row.getIsSelected() && 'selected'}
			data-dragging={isDragging}
			ref={setNodeRef}
			className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
			style={{
				transform: CSS.Transform.toString(transform),
				transition: transition,
			}}
		>
			{row.getVisibleCells().map((cell) => (
				<TableCell key={cell.id}>
					{flexRender(cell.column.columnDef.cell, cell.getContext())}
				</TableCell>
			))}
		</TableRow>
	)
}

export function StaticRow<TData>({ row }: StaticRowProps<TData>) {
	return (
		<TableRow data-state={row.getIsSelected() && 'selected'}>
			{row.getVisibleCells().map((cell) => (
				<TableCell key={cell.id}>
					{flexRender(cell.column.columnDef.cell, cell.getContext())}
				</TableCell>
			))}
		</TableRow>
	)
}
