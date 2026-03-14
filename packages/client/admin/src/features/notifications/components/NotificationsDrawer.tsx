import {
	Badge,
	Button,
	ScrollArea,
	Separator,
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@magnet-cms/ui'
import { Bell, CheckCheck, Loader2, Settings, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import {
	useMarkAllNotificationsAsRead,
	useMarkNotificationAsRead,
	useNotifications,
	useUnreadNotificationCount,
} from '~/hooks/useNotifications'

import { toNotification } from '../types'
import { NotificationItem } from './NotificationItem'

interface NotificationsDrawerProps {
	open?: boolean
	onOpenChange?: (open: boolean) => void
	showTrigger?: boolean
}

export function NotificationsDrawer({
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	showTrigger = true,
}: NotificationsDrawerProps) {
	const [internalOpen, setInternalOpen] = useState(false)
	const open = controlledOpen ?? internalOpen
	const setOpen = controlledOnOpenChange ?? setInternalOpen

	const { data, isLoading } = useNotifications({ limit: 20 })
	const { data: unreadData } = useUnreadNotificationCount()
	const markAsRead = useMarkNotificationAsRead()
	const markAllAsRead = useMarkAllNotificationsAsRead()

	const notifications = (data?.items ?? []).map(toNotification)
	const unreadCount = unreadData?.count ?? data?.unreadCount ?? 0

	const handleClose = () => setOpen(false)

	const handleMarkAsRead = (id: string) => {
		markAsRead.mutate(id)
	}

	const handleMarkAllAsRead = () => {
		markAllAsRead.mutate()
	}

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			{showTrigger && (
				<SheetTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="relative overflow-visible"
						onClick={(event) => {
							event.stopPropagation()
						}}
					>
						<Bell className="size-4" />
						{unreadCount > 0 && (
							<Badge
								variant="default"
								className="absolute -top-1 -right-1 flex size-5 items-center justify-center p-0 text-[10px]"
							>
								{unreadCount > 9 ? '9+' : unreadCount}
							</Badge>
						)}
						<span className="sr-only">
							Notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ''}
						</span>
					</Button>
				</SheetTrigger>
			)}

			<SheetContent
				side="right"
				className="flex w-full flex-col gap-0 p-0 sm:max-w-md [&>button:last-child]:hidden"
			>
				<SheetHeader className="border-b px-4 py-3">
					<div className="flex items-center justify-between">
						<SheetTitle className="text-lg">Notifications</SheetTitle>
						<div className="flex items-center gap-1">
							{unreadCount > 0 && (
								<Button
									variant="ghost"
									size="sm"
									onClick={handleMarkAllAsRead}
									disabled={markAllAsRead.isPending}
									className="h-8 gap-1.5 text-xs"
								>
									<CheckCheck className="size-3.5" />
									Mark all read
								</Button>
							)}
							<Button variant="ghost" size="icon" className="size-8" asChild>
								<Link to="/settings/notifications" onClick={handleClose}>
									<Settings className="size-4" />
									<span className="sr-only">Notification settings</span>
								</Link>
							</Button>
							<SheetClose asChild>
								<Button variant="ghost" size="icon" className="size-8">
									<X className="size-4" />
									<span className="sr-only">Close</span>
								</Button>
							</SheetClose>
						</div>
					</div>
				</SheetHeader>

				<ScrollArea className="flex-1">
					{isLoading ? (
						<div className="flex items-center justify-center p-8">
							<Loader2 className="size-6 animate-spin text-muted-foreground" />
						</div>
					) : notifications.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
							<div className="flex size-12 items-center justify-center rounded-full bg-muted">
								<Bell className="size-6 text-muted-foreground" />
							</div>
							<p className="text-sm font-medium">No notifications yet</p>
							<p className="text-xs text-muted-foreground">
								We&apos;ll notify you when something happens
							</p>
						</div>
					) : (
						<div className="divide-y">
							{notifications.map((notification) => (
								<NotificationItem
									key={notification.id}
									notification={notification}
									onMarkAsRead={handleMarkAsRead}
									onClose={handleClose}
								/>
							))}
						</div>
					)}
				</ScrollArea>

				{notifications.length > 0 && (
					<>
						<Separator />
						<div className="p-3">
							<Button variant="outline" className="w-full" asChild>
								<Link to="/notifications" onClick={handleClose}>
									View all notifications
								</Link>
							</Button>
						</div>
					</>
				)}
			</SheetContent>
		</Sheet>
	)
}
