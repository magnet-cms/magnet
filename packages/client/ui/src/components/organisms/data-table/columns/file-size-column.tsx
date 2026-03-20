import { type ColumnDef } from '@tanstack/react-table'

import type { DataTableFileSizeColumn } from '../types'

function formatFileSize(bytes: number, base: 1000 | 1024 = 1024): string {
	if (bytes === 0) return '0 B'

	const units =
		base === 1024
			? ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
			: ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

	const k = base
	const dm = 2
	const i = Math.floor(Math.log(bytes) / Math.log(k))

	return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${units[i]}`
}

export function createFileSizeColumn<TData>(
	column: DataTableFileSizeColumn<TData>,
): ColumnDef<TData> {
	return {
		id: column.accessorKey as string,
		accessorKey: column.accessorKey,
		header: column.header,
		enableSorting: column.enableSorting ?? true,
		enableHiding: column.enableHiding ?? true,
		cell: ({ row }) => {
			const rawValue = row.getValue(column.accessorKey as string)
			const numValue =
				typeof rawValue === 'number' ? rawValue : Number(rawValue)

			if (Number.isNaN(numValue)) {
				return <span>{String(rawValue ?? '')}</span>
			}

			if (column.format) {
				return column.format(numValue, row.original)
			}

			return <span>{formatFileSize(numValue, column.base)}</span>
		},
	}
}
