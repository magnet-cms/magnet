'use client'

import { Grid3x3, List, Search } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../../lib/utils'
import { Input } from '../../atoms/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../atoms/select'

export type ViewMode = 'grid' | 'list'

export interface FilterBarProps {
  children?: ReactNode
  className?: string
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-none flex-col items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-4 sm:flex-row',
        className
      )}
    >
      {children}
    </div>
  )
}

export interface FilterBarSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

function FilterBarSearch({
  value,
  onChange,
  placeholder = 'Search...',
  className,
}: FilterBarSearchProps) {
  return (
    <div className={cn('relative w-full sm:w-72', className)}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search className="size-4 text-gray-400" />
      </div>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  )
}

export interface FilterBarSelectOption {
  value: string
  label: string
}

export interface FilterBarSelectProps {
  value: string
  onChange: (value: string) => void
  options: FilterBarSelectOption[]
  placeholder?: string
  className?: string
  minWidth?: string
}

function FilterBarSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  minWidth = '120px',
}: FilterBarSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className} style={{ minWidth }}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export interface FilterBarViewToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
  className?: string
}

function FilterBarViewToggle({ value, onChange, className }: FilterBarViewToggleProps) {
  return (
    <div className={cn('flex rounded-lg bg-gray-200 p-0.5', className)}>
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={cn(
          'rounded-md p-1.5 transition-colors',
          value === 'grid'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        <Grid3x3 className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={cn(
          'rounded-md p-1.5 transition-colors',
          value === 'list'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        <List className="size-4" />
      </button>
    </div>
  )
}

function FilterBarDivider({ className }: { className?: string }) {
  return <div className={cn('mx-1 h-4 w-px bg-gray-300', className)} />
}

function FilterBarGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex w-full items-center gap-3 sm:w-auto', className)}>{children}</div>
}

// Attach sub-components
FilterBar.Search = FilterBarSearch
FilterBar.Select = FilterBarSelect
FilterBar.ViewToggle = FilterBarViewToggle
FilterBar.Divider = FilterBarDivider
FilterBar.Group = FilterBarGroup
