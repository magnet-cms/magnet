'use client'

import { ScrollArea, Switch } from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import { Clock, Shield, Key, User, Smartphone } from 'lucide-react'
import { useState } from 'react'

interface ActivityLog {
  id: string
  action: string
  description: string
  timestamp: string
  icon: typeof Clock | typeof Shield | typeof Key | typeof User | typeof Smartphone
}

const mockActivityLogs: ActivityLog[] = [
  {
    id: '1',
    action: 'Password Changed',
    description: 'Password was successfully updated',
    timestamp: '2 hours ago',
    icon: Key,
  },
  {
    id: '2',
    action: 'Profile Updated',
    description: 'Name and profile photo were updated',
    timestamp: '1 day ago',
    icon: User,
  },
  {
    id: '3',
    action: 'Two-Factor Enabled',
    description: 'Two-factor authentication was enabled',
    timestamp: '3 days ago',
    icon: Shield,
  },
  {
    id: '4',
    action: 'Session Revoked',
    description: 'Active session on iPhone 14 Pro was revoked',
    timestamp: '5 days ago',
    icon: Smartphone,
  },
  {
    id: '5',
    action: 'Login',
    description: 'Successful login from MacBook Pro 16"',
    timestamp: '1 week ago',
    icon: Clock,
  },
]

export function ActivityLogsPanel() {
  const [isCompact, setIsCompact] = useState(false)

  return (
    <aside className="w-80 bg-white border-l border-gray-200 hidden md:flex flex-col sticky top-0 h-screen">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Activity Logs
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Compact</span>
          <Switch checked={!isCompact} onCheckedChange={(checked) => setIsCompact(!checked)} />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className={cn('p-4', isCompact ? 'space-y-2' : 'space-y-4')}>
          {mockActivityLogs.map((log) => {
            const IconComponent = log.icon
            return (
              <div
                key={log.id}
                className={cn(
                  'flex gap-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-colors',
                  isCompact ? 'p-2' : 'p-3'
                )}
              >
                <div className="shrink-0 mt-0.5">
                  <div
                    className={cn(
                      'rounded-full bg-gray-100 flex items-center justify-center',
                      isCompact ? 'w-6 h-6' : 'w-8 h-8'
                    )}
                  >
                    <IconComponent
                      className={cn('text-gray-600', isCompact ? 'w-3 h-3' : 'w-4 h-4')}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-medium text-gray-900', isCompact ? 'text-xs' : 'text-sm')}>
                    {log.action}
                  </p>
                  {!isCompact && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{log.description}</p>
                  )}
                  <p
                    className={cn(
                      'text-gray-400',
                      isCompact ? 'text-[10px] mt-0.5' : 'text-xs mt-1.5'
                    )}
                  >
                    {log.timestamp}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </aside>
  )
}
