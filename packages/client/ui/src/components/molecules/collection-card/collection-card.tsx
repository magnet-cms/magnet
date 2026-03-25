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
  linkComponent?: ComponentType<{
    to: string
    className?: string
    children: ReactNode
  }>
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
        type="button"
        onClick={onCreateNew}
        className={cn(
          'group flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/50 p-5 text-center transition-all hover:border-muted-foreground/40 hover:bg-muted',
          className,
        )}
      >
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-background ring-1 ring-border transition-transform group-hover:scale-110">
          <Icon className="size-5 text-muted-foreground group-hover:text-foreground" />
        </div>
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="mt-1 text-xs text-muted-foreground">{description}</span>
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
            iconColor,
          )}
        >
          <Icon className="size-[22px]" />
        </div>
        <Badge
          variant={isSingle ? 'default' : 'outline'}
          className={cn(
            'rounded-full border px-2 py-1 text-[10px] font-medium',
            isSingle
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-muted text-muted-foreground',
          )}
        >
          {isSingle ? 'Single' : `${itemCount} items`}
        </Badge>
      </div>
      <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
        {title}
      </h3>
      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{description}</p>
    </>
  )

  const cardClassName = cn(
    'group relative block overflow-hidden rounded-xl bg-card p-5 shadow-sm ring-1 ring-border transition-all hover:shadow-md hover:ring-primary/40',
    isSingle && 'border-l-4 border-l-primary',
    className,
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
