import type {
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import * as React from 'react'

export type DataTableStateConfig = {
  enableSorting?: boolean
  enableColumnFilters?: boolean
  enableColumnVisibility?: boolean
  enablePagination?: boolean
  selectable?: boolean
  pageSizeOptions?: number[]
  initialSorting?: SortingState
  initialColumnFilters?: ColumnFiltersState
  initialColumnVisibility?: VisibilityState
  initialRowSelection?: RowSelectionState
  initialPagination?: PaginationState
}

export function useDataTableState({
  enableSorting,
  enableColumnFilters,
  enableColumnVisibility,
  enablePagination,
  selectable,
  pageSizeOptions = [10, 20, 30, 40, 50],
  initialSorting,
  initialColumnFilters,
  initialColumnVisibility,
  initialRowSelection,
  initialPagination,
}: DataTableStateConfig) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting ?? [])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    initialColumnFilters ?? []
  )
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    initialColumnVisibility ?? {}
  )
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    initialRowSelection ?? {}
  )
  const [pagination, setPagination] = React.useState<PaginationState>(
    initialPagination ?? {
      pageIndex: 0,
      pageSize: pageSizeOptions[0] ?? 10,
    }
  )

  return {
    sorting,
    setSorting: enableSorting ? setSorting : undefined,
    columnFilters,
    setColumnFilters: enableColumnFilters ? setColumnFilters : undefined,
    columnVisibility,
    setColumnVisibility: enableColumnVisibility ? setColumnVisibility : undefined,
    rowSelection,
    setRowSelection: selectable ? setRowSelection : undefined,
    pagination,
    setPagination: enablePagination ? setPagination : undefined,
  }
}
