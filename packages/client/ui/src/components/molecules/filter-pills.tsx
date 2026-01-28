'use client'

import { SlidersHorizontal } from 'lucide-react'

import { cn } from '../../lib/utils'
import { Button } from '../atoms/button'

export interface FilterPillOption {
  id: string
  label: string
}

interface FilterPillsProps<T extends string = string> {
  options: FilterPillOption[]
  value: T
  onChange: (value: T) => void
  showFiltersButton?: boolean
  onFiltersClick?: () => void
  filtersButtonLabel?: string
  className?: string
}

export function FilterPills<T extends string = string>({
  options,
  value,
  onChange,
  showFiltersButton = false,
  onFiltersClick,
  filtersButtonLabel = 'Filters',
  className,
}: FilterPillsProps<T>) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {options.map((option) => (
        <Button
          key={option.id}
          variant={value === option.id ? 'default' : 'outline'}
          size="sm"
          type="button"
          className={cn(
            'h-7 shrink-0 rounded-full px-3.5 text-xs font-medium',
            value === option.id
              ? 'bg-zinc-900 text-white hover:bg-zinc-800'
              : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
          )}
          onClick={() => onChange(option.id as T)}
        >
          {option.label}
        </Button>
      ))}

      {showFiltersButton && (
        <Button
          variant="outline"
          size="sm"
          type="button"
          className="h-7 gap-1 rounded-full border-zinc-200 bg-white px-3.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          onClick={onFiltersClick}
        >
          <SlidersHorizontal className="size-3" />
          {filtersButtonLabel}
        </Button>
      )}
    </div>
  )
}
