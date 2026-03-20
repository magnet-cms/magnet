import { type ColumnDef } from '@tanstack/react-table'

import type { DataTableColumn } from '../types'

import { createBadgeColumn } from './badge-column'
import { createCodeColumn } from './code-column'
import { createCurrencyColumn } from './currency-column'
import { createCustomColumn } from './custom-column'
import { createFileSizeColumn } from './file-size-column'
import { createInputColumn } from './input-column'
import { createLinkColumn } from './link-column'
import { createNumberColumn } from './number-column'
import { createSelectorColumn } from './selector-column'
import { createStatusColumn } from './status-column'
import { createTextColumn } from './text-column'

export function createColumnDefinitions<TData>(
	columns: DataTableColumn<TData>[],
): ColumnDef<TData>[] {
	return columns.map((column) => createColumnDefinition(column))
}

function createColumnDefinition<TData>(
	column: DataTableColumn<TData>,
): ColumnDef<TData> {
	switch (column.type) {
		case 'text':
			return createTextColumn(column)
		case 'badge':
			return createBadgeColumn(column)
		case 'status':
			return createStatusColumn(column)
		case 'input':
			return createInputColumn(column)
		case 'selector':
			return createSelectorColumn(column)
		case 'custom':
			return createCustomColumn(column)
		case 'number':
			return createNumberColumn(column)
		case 'currency':
			return createCurrencyColumn(column)
		case 'fileSize':
			return createFileSizeColumn(column)
		case 'code':
			return createCodeColumn(column)
		case 'link':
			return createLinkColumn(column)
	}
}
