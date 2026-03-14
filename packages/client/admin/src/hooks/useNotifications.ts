import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
	NotificationListOptions,
	NotificationRecord,
	PaginatedNotificationRecords,
} from '~/core/adapters/types'
import { useAdapter } from '~/core/provider/MagnetProvider'

// ============================================================================
// Query Keys
// ============================================================================

export const NOTIFICATION_KEYS = {
	all: ['notifications'] as const,
	list: (options?: NotificationListOptions) =>
		[...NOTIFICATION_KEYS.all, 'list', options] as const,
	unreadCount: () => [...NOTIFICATION_KEYS.all, 'unread-count'] as const,
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch paginated notifications for the current user.
 */
export function useNotifications(options?: NotificationListOptions) {
	const adapter = useAdapter()
	return useQuery<PaginatedNotificationRecords, Error>({
		queryKey: NOTIFICATION_KEYS.list(options),
		queryFn: () => adapter.notifications.list(options),
	})
}

/**
 * Fetch the unread notification count for the current user.
 * Refreshed on window focus so the badge stays up to date.
 */
export function useUnreadNotificationCount() {
	const adapter = useAdapter()
	return useQuery<{ count: number }, Error>({
		queryKey: NOTIFICATION_KEYS.unreadCount(),
		queryFn: () => adapter.notifications.getUnreadCount(),
		refetchOnWindowFocus: true,
		refetchInterval: 60_000,
	})
}

/**
 * Mark a single notification as read.
 * Optimistically updates the cache.
 */
export function useMarkNotificationAsRead() {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<
		void,
		Error,
		string,
		{
			snapshot: Array<
				[readonly unknown[], PaginatedNotificationRecords | undefined]
			>
		}
	>({
		mutationFn: (id: string) => adapter.notifications.markAsRead(id),
		onMutate: async (id: string) => {
			await queryClient.cancelQueries({ queryKey: NOTIFICATION_KEYS.all })

			// Capture current cache state for rollback
			const snapshot = queryClient.getQueriesData<PaginatedNotificationRecords>(
				{
					queryKey: NOTIFICATION_KEYS.all,
				},
			)

			// Optimistically mark as read in all list caches
			queryClient.setQueriesData<PaginatedNotificationRecords>(
				{ queryKey: NOTIFICATION_KEYS.all },
				(old) => {
					if (!old) return old
					const wasUnread = old.items.find((n) => n.id === id && !n.read)
					return {
						...old,
						unreadCount: wasUnread
							? Math.max(0, old.unreadCount - 1)
							: old.unreadCount,
						items: old.items.map(
							(n): NotificationRecord =>
								n.id === id
									? { ...n, read: true, readAt: new Date().toISOString() }
									: n,
						),
					}
				},
			)

			return { snapshot }
		},
		onError: (_err, _id, context) => {
			if (!context) return
			for (const [key, value] of context.snapshot) {
				queryClient.setQueryData(key, value)
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: NOTIFICATION_KEYS.unreadCount(),
			})
		},
	})
}

/**
 * Mark all notifications for the current user as read.
 */
export function useMarkAllNotificationsAsRead() {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<void, Error, void>({
		mutationFn: () => adapter.notifications.markAllAsRead(),
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey: NOTIFICATION_KEYS.all })

			queryClient.setQueriesData<PaginatedNotificationRecords>(
				{ queryKey: NOTIFICATION_KEYS.all },
				(old) => {
					if (!old) return old
					return {
						...old,
						unreadCount: 0,
						items: old.items.map(
							(n): NotificationRecord => ({
								...n,
								read: true,
								readAt: n.readAt ?? new Date().toISOString(),
							}),
						),
					}
				},
			)
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all })
		},
	})
}
