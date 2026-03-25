import { TimelineItem } from '@magnet-cms/ui'
import {
  AtSign,
  Bell,
  FileEdit,
  FilePlus,
  FileX,
  Globe,
  type LucideIcon,
  MessageSquare,
  UserPlus,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import type { Notification } from '../types'

/** Maps well-known notification types to icons. Falls back to Bell. */
const notificationIcons: Record<string, LucideIcon> = {
  system: Bell,
  mention: AtSign,
  comment: MessageSquare,
  'content.created': FilePlus,
  'content.updated': FileEdit,
  'content.published': Globe,
  'content.deleted': FileX,
  'user.registered': UserPlus,
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
      avatar={{ icon: Icon }}
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
