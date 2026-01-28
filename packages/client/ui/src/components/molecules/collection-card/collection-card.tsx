'use client'

import type { LucideIcon } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'

import { cn } from '../../../lib/utils'
import { Badge } from '../../atoms/badge'

export interface CollectionCardProps {
  icon: LucideIcon
  title: string
  description: string
  itemCount?: number
  href?: string
  iconBgColor?: string
  iconColor?: string
  /** Render as single-type collection (shows "Single" badge with left border) */
  isSingle?: boolean
  /** Render as create new card variant */
  isCreateNew?: boolean
  onCreateNew?: () => void
  className?: string
  /** Custom link component (e.g., React Router Link). Falls back to anchor tag */
  linkComponent?: ComponentType<{ to: string; className?: string; children: ReactNode }>
}

export function CollectionCard({
  icon: Icon,
  title,
  description,
  itemCount = 0,
  href,
  iconBgColor = 'bg-orange-50',
  iconColor = 'text-orange-600',
  isSingle = false,
  isCreateNew = false,
  onCreateNew,
  className,
  linkComponent: LinkComponent,
}: CollectionCardProps) {
  if (isCreateNew) {
    return (
      <button
        onClick={onCreateNew}
        className={cn(
          'group flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-5 text-center transition-all hover:border-gray-400 hover:bg-gray-100',
          className
        )}
      >
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-white ring-1 ring-gray-200 transition-transform group-hover:scale-110">
          <Icon className="size-5 text-gray-400 group-hover:text-gray-900" />
        </div>
        <span className="text-sm font-medium text-gray-900">{title}</span>
        <span className="mt-1 text-xs text-gray-500">{description}</span>
      </button>
    )
  }

  const cardContent = (
    <>
      <div className="mb-4 flex items-start justify-between">
        <div
          className={cn(
            'flex size-10 items-center justify-center rounded-lg transition-transform group-hover:scale-110',
            iconBgColor,
            iconColor
          )}
        >
          <Icon className="size-[22px]" />
        </div>
        <Badge
          variant={isSingle ? 'default' : 'outline'}
          className={cn(
            'rounded-full border px-2 py-1 text-[10px] font-medium',
            isSingle
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-100 bg-gray-50 text-gray-600'
          )}
        >
          {isSingle ? 'Single' : `${itemCount} items`}
        </Badge>
      </div>
      <h3 className="text-sm font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
        {title}
      </h3>
      <p className="mt-1 line-clamp-1 text-xs text-gray-500">{description}</p>
    </>
  )

  const cardClassName = cn(
    'group relative block overflow-hidden rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md hover:ring-blue-300',
    isSingle && 'border-l-4 border-l-gray-900',
    className
  )

  if (href && LinkComponent) {
    return (
      <LinkComponent to={href} className={cardClassName}>
        {cardContent}
      </LinkComponent>
    )
  }

  if (href) {
    return (
      <a href={href} className={cardClassName}>
        {cardContent}
      </a>
    )
  }

  return <div className={cardClassName}>{cardContent}</div>
}
