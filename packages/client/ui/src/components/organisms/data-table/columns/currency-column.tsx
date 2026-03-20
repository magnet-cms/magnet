import { type ColumnDef } from '@tanstack/react-table'

import type { DataTableCurrencyColumn } from '../types'

function formatCurrency(
	value: number,
	currency = 'USD',
	locale = 'en-US',
	minimumFractionDigits?: number,
	maximumFractionDigits?: number,
): string {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits,
		maximumFractionDigits,
	}).format(value)
}

export function createCurrencyColumn<TData>(
	column: DataTableCurrencyColumn<TData>,
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
					{formatCurrency(
						numValue,
						column.currency,
						column.locale,
						column.minimumFractionDigits,
						column.maximumFractionDigits,
					)}
				</span>
			)
		},
	}
}
