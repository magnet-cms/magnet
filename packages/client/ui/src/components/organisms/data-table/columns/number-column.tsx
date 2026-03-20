import { type ColumnDef } from '@tanstack/react-table'

import type { DataTableNumberColumn } from '../types'

function formatNumber(
	value: number,
	locale = 'en-US',
	minimumFractionDigits?: number,
	maximumFractionDigits?: number,
): string {
	return new Intl.NumberFormat(locale, {
		minimumFractionDigits,
		maximumFractionDigits,
	}).format(value)
}

export function createNumberColumn<TData>(
	column: DataTableNumberColumn<TData>,
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

			return (
				<span>
					{formatNumber(
						numValue,
						column.locale,
						column.minimumFractionDigits,
						column.maximumFractionDigits,
					)}
				</span>
			)
		},
	}
}
