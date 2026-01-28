'use client'

import type { LucideIcon } from 'lucide-react'

import { cn } from '../../../lib/utils'
import { Card, CardContent } from '../../atoms/card'

export interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  iconBgColor?: string
  iconColor?: string
  /** Optional description text below the value */
  description?: string
  /** Optional trend indicator */
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
  }
  className?: string
}

export function StatCard({
  icon: Icon,
  label,
  value,
  iconBgColor = 'bg-blue-50',
  iconColor = 'text-blue-600',
  description,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('shadow-sm ring-1 ring-gray-200', className)}>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            'flex size-10 items-center justify-center rounded-full',
            iconBgColor,
            iconColor
          )}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-semibold tracking-tight text-gray-900">{value}</p>
            {trend && (
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.direction === 'up' && 'text-green-600',
                  trend.direction === 'down' && 'text-red-600',
                  trend.direction === 'neutral' && 'text-gray-500'
                )}
              >
                {trend.direction === 'up' && '↑'}
                {trend.direction === 'down' && '↓'}
                {trend.value}%
              </span>
            )}
          </div>
          {description && <p className="text-xs text-gray-400">{description}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
