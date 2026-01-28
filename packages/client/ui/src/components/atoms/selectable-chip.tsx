'use client'

import { Check } from 'lucide-react'

import { cn } from '../../lib/utils'

interface SelectableChipProps {
  label: string
  selected?: boolean
  onClick?: () => void
  className?: string
  showCheckWhenSelected?: boolean
}

export function SelectableChip({
  label,
  selected = false,
  onClick,
  className,
  showCheckWhenSelected = true,
}: SelectableChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-all',
        selected
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:bg-accent/50',
        className
      )}
    >
      {selected && showCheckWhenSelected && <Check className="size-3" />}
      {label}
    </button>
  )
}
