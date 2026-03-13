'use client'

import { ScrollArea, Skeleton, Switch } from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { Clock, Key, Settings, Shield, Smartphone, User } from 'lucide-react'
import { useState } from 'react'
import type { ActivityRecord } from '~/core/adapters/types'
import { useUserActivity } from '~/hooks/useActivity'
import { useAuth } from '~/hooks/useAuth'

function getActivityIcon(action: string) {
	if (action.includes('password') || action.includes('api_key')) return Key
	if (action.includes('role') || action.includes('auth')) return Shield
	if (action.includes('session')) return Smartphone
	if (action.includes('settings')) return Settings
	if (action.includes('user')) return User
	return Clock
}

export function ActivityLogsPanel() {
	const [isCompact, setIsCompact] = useState(false)
	const { user } = useAuth()
	const { data: activities, isLoading } = useUserActivity(user?.id ?? '', 20)

	return (
		<aside className="w-80 bg-white border-l border-gray-200 hidden md:flex flex-col sticky top-0 h-screen">
			<div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
				<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
					Activity Logs
				</h3>
				<div className="flex items-center gap-2">
					<span className="text-xs text-gray-500">Compact</span>
					<Switch
						checked={!isCompact}
						onCheckedChange={(checked) => setIsCompact(!checked)}
					/>
				</div>
			</div>
			<ScrollArea className="flex-1">
				<div className={cn('p-4', isCompact ? 'space-y-2' : 'space-y-4')}>
					{isLoading && (
						<>
							{Array.from({ length: 5 }).map((_, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: skeleton
								<Skeleton key={i} className="h-14 rounded-lg" />
							))}
						</>
					)}
					{!isLoading && (!activities || activities.length === 0) && (
						<p className="text-xs text-gray-400 text-center py-4">
							No recent activity
						</p>
					)}
					{activities?.map((log: ActivityRecord) => {
						const IconComponent = getActivityIcon(log.action)
						return (
							<div
								key={log.id}
								className={cn(
									'flex gap-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-colors',
									isCompact ? 'p-2' : 'p-3',
								)}
							>
								<div className="shrink-0 mt-0.5">
									<div
										className={cn(
											'rounded-full bg-gray-100 flex items-center justify-center',
											isCompact ? 'w-6 h-6' : 'w-8 h-8',
										)}
									>
										<IconComponent
											className={cn(
												'text-gray-600',
												isCompact ? 'w-3 h-3' : 'w-4 h-4',
											)}
										/>
									</div>
								</div>
								<div className="flex-1 min-w-0">
									<p
										className={cn(
											'font-medium text-gray-900',
											isCompact ? 'text-xs' : 'text-sm',
										)}
									>
										{log.action
											.replace(/\./g, ' ')
											.replace(/\b\w/g, (c) => c.toUpperCase())}
									</p>
									{!isCompact && log.entityName && (
										<p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
											{log.entityName}
										</p>
									)}
									<p
										className={cn(
											'text-gray-400',
											isCompact ? 'text-[10px] mt-0.5' : 'text-xs mt-1.5',
										)}
									>
										{formatDistanceToNow(new Date(log.timestamp), {
											addSuffix: true,
										})}
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
