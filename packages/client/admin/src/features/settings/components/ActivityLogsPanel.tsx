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
		<aside className="sticky top-0 hidden h-screen w-80 flex-col border-l border-border bg-card md:flex">
			<div className="flex shrink-0 items-center justify-between border-b border-border p-4">
				<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Activity Logs
				</h3>
				<div className="flex items-center gap-2">
					<span className="text-xs text-muted-foreground">Compact</span>
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
						<p className="py-4 text-center text-xs text-muted-foreground/70">
							No recent activity
						</p>
					)}
					{activities?.map((log: ActivityRecord) => {
						const IconComponent = getActivityIcon(log.action)
						return (
							<div
								key={log.id}
								className={cn(
									'flex gap-3 rounded-lg border border-border transition-colors hover:bg-muted/50',
									isCompact ? 'p-2' : 'p-3',
								)}
							>
								<div className="mt-0.5 shrink-0">
									<div
										className={cn(
											'flex items-center justify-center rounded-full bg-muted',
											isCompact ? 'size-6' : 'size-8',
										)}
									>
										<IconComponent
											className={cn(
												'text-muted-foreground',
												isCompact ? 'size-3' : 'size-4',
											)}
										/>
									</div>
								</div>
								<div className="min-w-0 flex-1">
									<p
										className={cn(
											'font-medium text-foreground',
											isCompact ? 'text-xs' : 'text-sm',
										)}
									>
										{log.action
											.replace(/\./g, ' ')
											.replace(/\b\w/g, (c) => c.toUpperCase())}
									</p>
									{!isCompact && log.entityName && (
										<p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
											{log.entityName}
										</p>
									)}
									<p
										className={cn(
											'text-muted-foreground/80',
											isCompact ? 'mt-0.5 text-[10px]' : 'mt-1.5 text-xs',
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
