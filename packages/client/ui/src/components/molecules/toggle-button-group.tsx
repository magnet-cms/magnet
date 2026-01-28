'use client'

import { cn } from '../../lib/utils'

export interface ToggleButtonOption<T extends string = string> {
  value: T
  label: string
}

interface ToggleButtonGroupProps<T extends string = string> {
  options: ToggleButtonOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function ToggleButtonGroup<T extends string = string>({
  options,
  value,
  onChange,
  className,
}: ToggleButtonGroupProps<T>) {
  return (
    <div className={cn('flex rounded-lg bg-muted p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-all',
            value === option.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
