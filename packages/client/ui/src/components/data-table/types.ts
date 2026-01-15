import { type Row, type Table as TableType } from '@tanstack/react-table'
import * as React from 'react'

type DataKey<TData> = Extract<keyof TData, string> | string

export type DataTableRowAction<TData> = {
	label: string
	onSelect: (row: TData) => void
	id?: string
	destructive?: boolean
}

type BaseColumn<TData> = {
	header: string
	accessorKey?: DataKey<TData>
	enableSorting?: boolean
	enableHiding?: boolean
}

export type DataTableTextColumn<TData> = BaseColumn<TData> & {
	type: 'text'
	accessorKey: DataKey<TData>
	format?: (value: unknown, row: TData) => React.ReactNode
}

export type DataTableBadgeColumn<TData> = BaseColumn<TData> & {
	type: 'badge'
	accessorKey: DataKey<TData>
	format?: (value: unknown, row: TData) => React.ReactNode
}

export type DataTableStatusColumn<TData> = BaseColumn<TData> & {
	type: 'status'
	accessorKey: DataKey<TData>
	statusConfig?: {
		positiveValues?: (string | boolean | number)[]
		labels?: Record<string, string>
	}
}

export type DataTableInputColumn<TData> = BaseColumn<TData> & {
	type: 'input'
	accessorKey: DataKey<TData>
	inputConfig?: {
		placeholder?: string
		align?: 'left' | 'right'
		onSubmit?: (value: string, row: TData) => Promise<void> | void
	}
}

export type DataTableSelectorColumn<TData> = BaseColumn<TData> & {
	type: 'selector'
	accessorKey: DataKey<TData>
	options: { label: string; value: string }[]
	placeholder?: string
	onChange?: (value: string, row: TData) => void
}

export type DataTableCustomColumn<TData> = BaseColumn<TData> & {
	type: 'custom'
	cell: (row: Row<TData>) => React.ReactNode
}

export type DataTableNumberColumn<TData> = BaseColumn<TData> & {
	type: 'number'
	accessorKey: DataKey<TData>
	format?: (value: number, row: TData) => React.ReactNode
	locale?: string
	minimumFractionDigits?: number
	maximumFractionDigits?: number
}

export type DataTableCurrencyColumn<TData> = BaseColumn<TData> & {
	type: 'currency'
	accessorKey: DataKey<TData>
	format?: (value: number, row: TData) => React.ReactNode
	currency?: string
	locale?: string
	minimumFractionDigits?: number
	maximumFractionDigits?: number
}

export type DataTableFileSizeColumn<TData> = BaseColumn<TData> & {
	type: 'fileSize'
	accessorKey: DataKey<TData>
	format?: (value: number, row: TData) => React.ReactNode
	base?: 1000 | 1024
}

export type DataTableCodeColumn<TData> = BaseColumn<TData> & {
	type: 'code'
	accessorKey: DataKey<TData>
	format?: (value: unknown, row: TData) => React.ReactNode
}

export type DataTableLinkColumn<TData> = BaseColumn<TData> & {
	type: 'link'
	accessorKey: DataKey<TData>
	linkConfig?: {
		label?: string | ((value: string, row: TData) => string)
		target?: '_blank' | '_self'
		rel?: string
		className?: string
	}
	format?: (value: unknown, row: TData) => React.ReactNode
}

export type DataTableColumn<TData> =
	| DataTableTextColumn<TData>
	| DataTableBadgeColumn<TData>
	| DataTableStatusColumn<TData>
	| DataTableInputColumn<TData>
	| DataTableSelectorColumn<TData>
	| DataTableCustomColumn<TData>
	| DataTableNumberColumn<TData>
	| DataTableCurrencyColumn<TData>
	| DataTableFileSizeColumn<TData>
	| DataTableCodeColumn<TData>
	| DataTableLinkColumn<TData>

export type DataTableOptions<TData> = {
	draggable?: {
		enabled: boolean
		onReorder?: (rows: TData[]) => void
	}
	selectable?: boolean
	rowActions?: {
		items: DataTableRowAction<TData>[]
	}
}

export type DataTableRenderContext<TData> = TableType<TData>

export type DataTableProps<TData> = {
	data: TData[]
	columns: DataTableColumn<TData>[]
	options?: DataTableOptions<TData>
	getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string
	meta?: TableType<TData>['options']['meta']
	renderToolbar?: (table: DataTableRenderContext<TData>) => React.ReactNode
	renderPagination?: (table: DataTableRenderContext<TData>) => React.ReactNode
	renderEmpty?: (table: DataTableRenderContext<TData>) => React.ReactNode
	enableSorting?: boolean
	enableColumnFilters?: boolean
	enableColumnVisibility?: boolean
	enablePagination?: boolean
	pageSizeOptions?: number[]
	initialSorting?: import('@tanstack/react-table').SortingState
	initialColumnFilters?: import('@tanstack/react-table').ColumnFiltersState
	initialColumnVisibility?: import('@tanstack/react-table').VisibilityState
	initialRowSelection?: import('@tanstack/react-table').RowSelectionState
	initialPagination?: import('@tanstack/react-table').PaginationState
	className?: string
	showCount?: boolean
	totalCount?: number
	countLabel?: (count: number, total?: number) => string
}

export type { DataKey }
