'use client'

import type { ReactNode } from 'react'

import { cn } from '../../../lib/utils'

export interface PageHeaderProps {
  children: ReactNode
  className?: string
  /** Whether the header is sticky. Default: true */
  sticky?: boolean
  /** Whether to show backdrop blur effect. Default: true */
  backdrop?: boolean
}

export function PageHeader({
  children,
  className,
  sticky = true,
  backdrop = true,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'shrink-0 border-b border-gray-200 z-20',
        sticky && 'sticky top-0',
        backdrop && 'bg-white/80 backdrop-blur-md',
        !backdrop && 'bg-white',
        className
      )}
    >
      {children}
    </header>
  )
}
