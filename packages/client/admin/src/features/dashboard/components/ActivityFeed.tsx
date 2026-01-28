import { Card } from '@magnet-cms/ui'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { ActivityItem } from './ActivityItem'

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
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
      </div>
      <Card className="shadow-sm ring-1 ring-gray-200 overflow-hidden py-0">
        <ul className="divide-y divide-gray-100">
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
            <li className="p-4 bg-gray-50/50 text-center">
              <button
                onClick={onViewAll}
                className="text-xs font-medium text-gray-500 hover:text-gray-900"
              >
                View all logs
              </button>
            </li>
          )}
        </ul>
      </Card>
    </div>
  )
}
