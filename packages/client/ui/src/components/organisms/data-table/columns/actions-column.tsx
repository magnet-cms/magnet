import { IconDotsVertical, IconPencil, IconTrash } from '@tabler/icons-react'
import { type ColumnDef } from '@tanstack/react-table'
import * as React from 'react'

import { cn } from '../../../../lib/utils'
import { Button } from '../../../atoms/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../atoms/dropdown-menu'
import type { DataTableRowAction, DataTableVariant } from '../types'

export function createActionsColumn<TData>(
  actions: DataTableRowAction<TData>[],
  variant?: DataTableVariant
): ColumnDef<TData> {
  const isContentManagerVariant = variant === 'content-manager'

  // For content-manager variant, show inline icon buttons
  if (isContentManagerVariant && actions.length <= 2) {
    return {
      id: '__actions',
      header: () => (
        <div className="relative px-6 py-3">
          <span className="sr-only">Actions</span>
        </div>
      ),
      cell: ({ row }) => (
        <div className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {actions.map((action) => {
              const key = action.id ?? action.label
              const isDisabled = action.disabled?.(row.original) ?? false
              const Icon =
                action.label.toLowerCase().includes('edit') ||
                action.label.toLowerCase().includes('pen')
                  ? IconPencil
                  : action.label.toLowerCase().includes('delete') ||
                      action.label.toLowerCase().includes('trash')
                    ? IconTrash
                    : IconDotsVertical

              return (
                <button
                  key={key}
                  onClick={() => !isDisabled && action.onSelect(row.original)}
                  disabled={isDisabled}
                  className={cn(
                    'p-1 transition-colors',
                    isDisabled && 'opacity-30 cursor-not-allowed',
                    !isDisabled && action.destructive && 'text-gray-400 hover:text-red-600',
                    !isDisabled && !action.destructive && 'text-gray-400 hover:text-gray-600'
                  )}
                  aria-label={action.label}
                >
                  <Icon width={16} height={16} />
                </button>
              )
            })}
          </div>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    }
  }

  // Default dropdown menu
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
            <IconDotsVertical />
            <span className="sr-only">Open row actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {actions.map((action) => {
            const key = action.id ?? action.label
            const isDisabled = action.disabled?.(row.original) ?? false
            return action.destructive ? (
              <React.Fragment key={key}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={isDisabled}
                  onSelect={() => action.onSelect(row.original)}
                >
                  {action.label}
                </DropdownMenuItem>
              </React.Fragment>
            ) : (
              <DropdownMenuItem
                key={key}
                disabled={isDisabled}
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
