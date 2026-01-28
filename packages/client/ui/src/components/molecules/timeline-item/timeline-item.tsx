'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../../lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '../../atoms/avatar'
import { Badge } from '../../atoms/badge'

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }

  return date.toLocaleDateString()
}

export interface TimelineItemProps {
  /** Avatar configuration - supports image src, fallback initials, or icon */
  avatar?: {
    src?: string
    fallback?: string
    icon?: LucideIcon
  }
  /** Background color class for icon/avatar container */
  iconBgColor?: string
  /** Text color class for icon */
  iconColor?: string
  /** Optional title displayed above the message */
  title?: ReactNode
  /** Main message content */
  message: ReactNode
  /** Timestamp - can be a string or Date (Date will be formatted as relative time) */
  timestamp: string | Date
  /** Whether this item is unread (shows indicator) */
  isUnread?: boolean
  /** URL to navigate to when clicked */
  href?: string
  /** Click handler */
  onClick?: () => void
  /** Additional actions to render */
  actions?: ReactNode
  /** Visual variant - compact for activity feeds, default for notifications */
  variant?: 'compact' | 'default'
  /** Additional className */
  className?: string
}

export function TimelineItem({
  avatar,
  iconBgColor = 'bg-blue-100',
  iconColor = 'text-blue-600',
  title,
  message,
  timestamp,
  isUnread = false,
  href,
  onClick,
  actions,
  variant = 'default',
  className,
}: TimelineItemProps) {
  const Icon = avatar?.icon
  const formattedTimestamp = timestamp instanceof Date ? formatRelativeTime(timestamp) : timestamp

  const isCompact = variant === 'compact'
  const avatarSize = isCompact ? 'size-6' : 'size-9'
  const iconSize = isCompact ? 'size-3' : 'size-4'

  const content = (
    <div
      className={cn(
        'flex gap-3 transition-colors',
        isCompact ? 'p-4 hover:bg-gray-50' : 'p-3 hover:bg-accent/50',
        isUnread && !isCompact && 'bg-accent/30',
        className
      )}
    >
      {/* Avatar/Icon */}
      {avatar?.src ? (
        <Avatar className={cn('shrink-0', avatarSize, !isCompact && 'mt-0')}>
          <AvatarImage src={avatar.src} alt="" />
          <AvatarFallback>
            {Icon ? <Icon className={cn(iconSize, 'text-muted-foreground')} /> : avatar.fallback}
          </AvatarFallback>
        </Avatar>
      ) : avatar?.fallback ? (
        <Avatar className={cn('shrink-0', avatarSize, isCompact && 'mt-0.5')}>
          <AvatarFallback className={cn('text-[10px]', iconBgColor, iconColor)}>
            {avatar.fallback}
          </AvatarFallback>
        </Avatar>
      ) : Icon ? (
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full',
            avatarSize,
            isCompact && 'mt-0.5',
            iconBgColor,
            iconColor
          )}
        >
          <Icon className={iconSize} />
        </div>
      ) : null}

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && (
          <div className="flex items-start justify-between gap-2">
            <p className={cn('text-sm', isUnread && !isCompact && 'font-medium')}>{title}</p>
            {isUnread && !isCompact && (
              <Badge variant="default" className="size-2 shrink-0 rounded-full p-0" />
            )}
          </div>
        )}
        <p
          className={cn(
            isCompact
              ? 'text-xs leading-snug text-gray-900'
              : 'line-clamp-2 text-xs text-muted-foreground'
          )}
        >
          {message}
        </p>
        <span
          className={cn(
            isCompact ? 'mt-1 text-[10px] text-gray-400' : 'text-xs text-muted-foreground'
          )}
        >
          {formattedTimestamp}
        </span>
      </div>

      {/* Actions */}
      {actions}
    </div>
  )

  // Wrap in link or button if interactive
  if (href) {
    return (
      <a href={href} onClick={onClick} className="block">
        {content}
      </a>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left">
        {content}
      </button>
    )
  }

  // For compact variant (ActivityItem), render as list item
  if (isCompact) {
    return <li>{content}</li>
  }

  return content
}
