import { TimelineItem } from '@magnet-cms/ui'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface ActivityItemProps {
  userInitials?: string
  icon?: LucideIcon
  iconBgColor?: string
  iconColor?: string
  message: ReactNode
  timestamp: string
}

export function ActivityItem({
  userInitials,
  icon,
  iconBgColor = 'bg-blue-100',
  iconColor = 'text-blue-600',
  message,
  timestamp,
}: ActivityItemProps) {
  return (
    <TimelineItem
      avatar={{
        fallback: userInitials,
        icon: icon,
      }}
      iconBgColor={iconBgColor}
      iconColor={iconColor}
      message={message}
      timestamp={timestamp}
      variant="compact"
    />
  )
}
