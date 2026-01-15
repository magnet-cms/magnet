'use client'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import {
	ColumnDef,
	Row,
	flexRender,
	getCoreRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table'
import * as React from 'react'

import { Table, TableBody, TableHead, TableHeader, TableRow } from '../ui/table'

import {
	createActionsColumn,
	createColumnDefinitions,
	createDragColumn,
	createSelectionColumn,
} from './columns'
import {
	DataTableEmptyState,
	DataTablePagination,
	DraggableRow,
	StaticRow,
} from './components'
import { useDataTableState, useDragAndDrop } from './hooks'
import type { DataTableProps } from './types'

const defaultPageSizeOptions = [10, 20, 30, 40, 50]

export function DataTable<TData>({
	data,
	columns,
	options,
	getRowId,
	meta,
	renderToolbar,
	renderPagination,
	renderEmpty,
	enableSorting = true,
	enableColumnFilters = true,
	enableColumnVisibility = true,
	enablePagination = true,
	pageSizeOptions = defaultPageSizeOptions,
	initialSorting,
	initialColumnFilters,
	initialColumnVisibility,
	initialRowSelection,
	initialPagination,
	className,
	showCount = true,
	totalCount,
	countLabel,
}: DataTableProps<TData>) {
	const [isClient, setIsClient] = React.useState(false)

	React.useEffect(() => {
		setIsClient(true)
	}, [])

	const stableGetRowId = React.useCallback(
		(originalRow: TData, index: number, parent?: Row<TData>) => {
			if (getRowId) {
				return getRowId(originalRow, index, parent)
			}
			return index.toString()
		},
		[getRowId],
	)

	const tableState = useDataTableState({
		enableSorting,
		enableColumnFilters,
		enableColumnVisibility,
		enablePagination,
		selectable: options?.selectable,
		pageSizeOptions,
		initialSorting,
		initialColumnFilters,
		initialColumnVisibility,
		initialRowSelection,
		initialPagination,
	})

	const dragAndDrop = useDragAndDrop({
		data,
		getRowId: stableGetRowId,
		config: options?.draggable,
	})

	const computedColumns = React.useMemo(() => {
		const defs: ColumnDef<TData>[] = createColumnDefinitions<TData>(columns)

		if (options?.rowActions?.items?.length) {
			defs.push(createActionsColumn(options.rowActions.items))
		}

		if (options?.selectable) {
			defs.unshift(createSelectionColumn<TData>())
		}

		if (options?.draggable?.enabled) {
			defs.unshift(createDragColumn<TData>())
		}

		return defs
	}, [columns, options])

	// eslint-disable-next-line react-hooks/incompatible-library
	const table = useReactTable({
		data: dragAndDrop.tableData,
		columns: computedColumns,
		state: {
			sorting: tableState.sorting,
			columnFilters: tableState.columnFilters,
			columnVisibility: tableState.columnVisibility,
			rowSelection: tableState.rowSelection,
			pagination: tableState.pagination,
		},
		getRowId: stableGetRowId,
		enableRowSelection: options?.selectable ?? false,
		meta,
		onSortingChange: tableState.setSorting,
		onColumnFiltersChange: tableState.setColumnFilters,
		onColumnVisibilityChange: tableState.setColumnVisibility,
		onRowSelectionChange: tableState.setRowSelection,
		onPaginationChange: tableState.setPagination,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: enableColumnFilters
			? getFilteredRowModel()
			: undefined,
		getFacetedRowModel: enableColumnFilters ? getFacetedRowModel() : undefined,
		getFacetedUniqueValues: enableColumnFilters
			? getFacetedUniqueValues()
			: undefined,
		getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
		getPaginationRowModel: enablePagination
			? getPaginationRowModel()
			: undefined,
	})

	const rows = table.getRowModel().rows
	const isDraggable = isClient && (options?.draggable?.enabled ?? false)
	const hasRows = rows.length > 0

	const tableBody = React.useMemo(() => {
		if (!hasRows) {
			return <DataTableEmptyState table={table} renderEmpty={renderEmpty} />
		}

		const bodyRows = isDraggable
			? rows.map((row) => <DraggableRow key={row.id} row={row} />)
			: rows.map((row) => <StaticRow key={row.id} row={row} />)

		const body = (
			<TableBody className="**:data-[slot=table-cell]:first:w-8">
				{bodyRows}
			</TableBody>
		)

		if (isDraggable) {
			return (
				<SortableContext
					items={rows.map((row) => row.id)}
					strategy={verticalListSortingStrategy}
				>
					{body}
				</SortableContext>
			)
		}

		return body
	}, [hasRows, isDraggable, renderEmpty, rows, table])

	const tableContent = (
		<div className="overflow-hidden rounded-lg border">
			<Table>
				<TableHeader className="bg-muted sticky top-0 z-10">
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead key={header.id} colSpan={header.colSpan}>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				{tableBody}
			</Table>
		</div>
	)

	return (
		<div className={className}>
			{renderToolbar?.(table)}
			{isDraggable && hasRows ? (
				<DndContext
					collisionDetection={closestCenter}
					modifiers={[restrictToVerticalAxis]}
					onDragStart={dragAndDrop.handleDragStart}
					onDragEnd={dragAndDrop.handleDragEnd}
					sensors={dragAndDrop.sensors}
				>
					{tableContent}
				</DndContext>
			) : (
				tableContent
			)}
			{(enablePagination || renderPagination) &&
				(renderPagination?.(table) ?? (
					<DataTablePagination
						table={table}
						pageSizeOptions={pageSizeOptions}
					/>
				))}
			{showCount &&
				(() => {
					const filteredCount = table.getFilteredRowModel().rows.length
					const displayCount =
						totalCount !== undefined ? totalCount : filteredCount

					const label = countLabel
						? countLabel(displayCount, totalCount)
						: `${displayCount} ${displayCount === 1 ? 'item' : 'items'} found`

					return <p className="text-muted-foreground mt-4 text-sm">{label}</p>
				})()}
		</div>
	)
}

export type {
	DataTableColumn,
	DataTableCustomColumn,
	DataTableOptions,
	DataTableProps,
	DataTableRenderContext,
	DataTableRowAction,
	DataTableSelectorColumn,
	DataTableInputColumn,
	DataTableStatusColumn,
	DataTableBadgeColumn,
	DataTableTextColumn,
	DataTableNumberColumn,
	DataTableCurrencyColumn,
	DataTableFileSizeColumn,
	DataTableCodeColumn,
	DataTableLinkColumn,
} from './types'
