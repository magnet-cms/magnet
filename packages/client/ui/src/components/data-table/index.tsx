import {
	ColumnDef,
	ColumnFiltersState,
	SortingState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { names } from '@magnet/utils'
import {
	ArrowUpDown,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Search,
} from 'lucide-react'
import { useState } from 'react'

interface DataTableProps<TData> {
	data: TData[]
	columns?: ColumnDef<TData>[]
	searchable?: boolean
	pagination?: boolean
	sortable?: boolean
}

export function DataTable<TData extends object>({
	data,
	columns: customColumns,
	searchable = true,
	pagination = true,
	sortable = true,
}: DataTableProps<TData>) {
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [globalFilter, setGlobalFilter] = useState<string>('')

	// If columns are not provided, generate them automatically from the data
	const generatedColumns: ColumnDef<TData>[] =
		!customColumns && data && data.length > 0
			? Object.keys(data[0] as object).map((key) => {
					const isId = key === 'id'
					const isDate = /At$/.test(key) // Detect date fields like createdAt, updatedAt
					const header = names(key).title

					return {
						accessorKey: key,
						header: ({ column }) => {
							return sortable ? (
								<Button
									variant="ghost"
									size="sm"
									className="-ml-4 h-8 data-[state=open]:bg-accent"
									onClick={() =>
										column.toggleSorting(column.getIsSorted() === 'asc')
									}
								>
									{header}
									<ArrowUpDown className="ml-2 h-4 w-4" />
								</Button>
							) : (
								header
							)
						},
						cell: ({ row }) => {
							const value = row.getValue(key)

							if (isId) {
								return (
									<span className="font-mono text-xs">
										{String(value).slice(0, 8)}...
									</span>
								)
							}

							if (isDate && value) {
								return new Date(value as string).toLocaleString()
							}

							if (typeof value === 'boolean') {
								return value ? 'Yes' : 'No'
							}

							if (value === null || value === undefined) {
								return (
									<span className="text-muted-foreground italic">Empty</span>
								)
							}

							if (typeof value === 'object') {
								return (
									<span className="text-muted-foreground italic">Object</span>
								)
							}

							return String(value)
						},
					}
				})
			: []

	const columns = customColumns || generatedColumns

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
		onSortingChange: setSorting,
		getSortedRowModel: sortable ? getSortedRowModel() : undefined,
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		onGlobalFilterChange: setGlobalFilter,
		state: {
			sorting,
			columnFilters,
			globalFilter,
		},
		initialState: {
			pagination: {
				pageSize: 10,
			},
		},
	})

	return (
		<div className="w-full space-y-4">
			{searchable && (
				<div className="flex items-center">
					<div className="relative flex-1 max-w-md">
						<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search all columns..."
							value={globalFilter ?? ''}
							onChange={(e) => setGlobalFilter(e.target.value)}
							className="pl-8"
						/>
					</div>
				</div>
			)}

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id}>
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
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && 'selected'}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{pagination && (
				<div className="flex items-center justify-between">
					<div className="flex-1 text-sm text-muted-foreground">
						{table.getFilteredRowModel().rows.length} row(s) total
					</div>
					<div className="flex items-center space-x-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.setPageIndex(0)}
							disabled={!table.getCanPreviousPage()}
						>
							<ChevronsLeft className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<span className="flex items-center gap-1 text-sm font-medium">
							Page{' '}
							<strong>
								{table.getState().pagination.pageIndex + 1} of{' '}
								{table.getPageCount()}
							</strong>
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.setPageIndex(table.getPageCount() - 1)}
							disabled={!table.getCanNextPage()}
						>
							<ChevronsRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}
