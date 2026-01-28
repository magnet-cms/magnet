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
import { Bell, CheckCheck, Settings, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import type { Notification } from '../types'

import { NotificationItem } from './NotificationItem'

// Mock data for demonstration
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'trip_invite',
    title: 'Sarah invited you to a trip',
    message: "You've been invited to join Euro Summer '25 trip. Accept to start planning together!",
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
    read: false,
    href: '/trips/euro-summer-25',
    avatar: 'https://github.com/shadcn.png',
  },
  {
    id: '2',
    type: 'comment',
    title: 'Mike commented on your itinerary',
    message: 'Looks great! Should we add a day trip to Mt. Fuji?',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    read: false,
    href: '/trips/japan-workation',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop',
  },
  {
    id: '3',
    type: 'trip_update',
    title: 'Trip dates updated',
    message: 'Japan Workation dates have been changed to March 15-25, 2026.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: true,
    href: '/trips/japan-workation',
  },
  {
    id: '4',
    type: 'mention',
    title: 'Alex mentioned you',
    message: '@johndoe what do you think about the hotel options?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    read: true,
    href: '/trips/euro-summer-24',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=32&h=32&fit=crop',
  },
  {
    id: '5',
    type: 'system',
    title: 'Welcome to Magnet!',
    message: 'Start planning your first trip or explore templates for inspiration.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: true,
    href: '/explore',
  },
]

interface NotificationsDrawerProps {
  notifications?: Notification[]
  onMarkAsRead?: (id: string) => void
  onMarkAllAsRead?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
}

export function NotificationsDrawer({
  notifications = mockNotifications,
  onMarkAsRead,
  onMarkAllAsRead,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  showTrigger = true,
}: NotificationsDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAsRead = (id: string) => {
    onMarkAsRead?.(id)
  }

  const handleMarkAllAsRead = () => {
    onMarkAllAsRead?.()
  }

  const handleClose = () => {
    setOpen(false)
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
          {notifications.length === 0 ? (
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
