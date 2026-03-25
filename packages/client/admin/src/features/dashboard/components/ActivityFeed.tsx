import { Card } from '@magnet-cms/ui'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { ActivityItem } from './ActivityItem'

import { useAppIntl } from '~/i18n'

interface Activity {
  id: string
  userInitials?: string
  icon?: LucideIcon
  iconBgColor?: string
  iconColor?: string
  message: ReactNode
  timestamp: string
}

interface ActivityFeedProps {
  activities: Activity[]
  onViewAll?: () => void
}

export function ActivityFeed({ activities, onViewAll }: ActivityFeedProps) {
  const intl = useAppIntl()
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">
          {intl.formatMessage({
            id: 'dashboard.activity.title',
            defaultMessage: 'Recent Activity',
          })}
        </h2>
      </div>
      <Card className="shadow-sm ring-1 ring-border overflow-hidden py-0">
        <ul className="divide-y divide-border">
          {activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              userInitials={activity.userInitials}
              icon={activity.icon}
              message={activity.message}
              timestamp={activity.timestamp}
              iconBgColor={activity.iconBgColor}
              iconColor={activity.iconColor}
            />
          ))}
          {onViewAll && (
            <li className="p-4 bg-muted/50 text-center">
              <button
                type="button"
                onClick={onViewAll}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {intl.formatMessage({
                  id: 'dashboard.activity.viewAllLogs',
                  defaultMessage: 'View all logs',
                })}
              </button>
            </li>
          )}
        </ul>
      </Card>
    </div>
  )
}
