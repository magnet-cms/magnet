import { type Table as TableType } from '@tanstack/react-table'

import { TableBody, TableCell, TableRow } from '../../ui/table'

export function DataTableEmptyState<TData>({
	table,
	renderEmpty,
}: {
	table: TableType<TData>
	renderEmpty?: (table: TableType<TData>) => React.ReactNode
}) {
	return (
		<TableBody>
			<TableRow>
				<TableCell
					colSpan={table.getAllLeafColumns().length}
					className="h-24 text-center"
				>
					{renderEmpty?.(table) ?? 'No results.'}
				</TableCell>
			</TableRow>
		</TableBody>
	)
}
