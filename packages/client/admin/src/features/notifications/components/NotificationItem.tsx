import { TimelineItem } from '@magnet-cms/ui'
import { AtSign, Bell, Calendar, MessageSquare, Users, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { Notification, NotificationType } from '../types'

const notificationIcons: Record<NotificationType, LucideIcon> = {
  trip_invite: Users,
  trip_update: Calendar,
  comment: MessageSquare,
  mention: AtSign,
  system: Bell,
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead?: (id: string) => void
  onClose?: () => void
}

export function NotificationItem({ notification, onMarkAsRead, onClose }: NotificationItemProps) {
  const Icon = notificationIcons[notification.type] ?? Bell

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead?.(notification.id)
    }
    onClose?.()
  }

  const timelineItem = (
    <TimelineItem
      avatar={{
        src: notification.avatar,
        icon: Icon,
      }}
      title={notification.title}
      message={notification.message}
      timestamp={notification.timestamp}
      isUnread={!notification.read}
      onClick={!notification.href ? handleClick : undefined}
      variant="default"
    />
  )

  if (notification.href) {
    return (
      <Link to={notification.href} onClick={handleClick} className="block">
        {timelineItem}
      </Link>
    )
  }

  return timelineItem
}
