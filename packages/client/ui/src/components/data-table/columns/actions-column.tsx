import { type ColumnDef } from '@tanstack/react-table'
import { MoreVertical } from 'lucide-react'
import * as React from 'react'

import { Button } from '../../ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../../ui/dropdown-menu'

import type { DataTableRowAction } from '../types'

export function createActionsColumn<TData>(
	actions: DataTableRowAction<TData>[],
): ColumnDef<TData> {
	return {
		id: '__actions',
		cell: ({ row }) => (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
						size="icon"
					>
						<MoreVertical className="h-4 w-4" />
						<span className="sr-only">Open row actions</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					{actions.map((action) => {
						const key = action.id ?? action.label
						return action.destructive ? (
							<React.Fragment key={key}>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									variant="destructive"
									onSelect={() => action.onSelect(row.original)}
								>
									{action.label}
								</DropdownMenuItem>
							</React.Fragment>
						) : (
							<DropdownMenuItem
								key={key}
								onSelect={() => action.onSelect(row.original)}
							>
								{action.label}
							</DropdownMenuItem>
						)
					})}
				</DropdownMenuContent>
			</DropdownMenu>
		),
		enableSorting: false,
		enableHiding: false,
	}
}
