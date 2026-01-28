export type NotificationType = 'trip_invite' | 'trip_update' | 'comment' | 'mention' | 'system'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  read: boolean
  href?: string
  avatar?: string
}
