import type { NotificationRecord } from '~/core/adapters/types'

/**
 * Well-known notification type identifiers.
 * The backend accepts any `string` — extend this union when adding new types.
 */
export type NotificationType =
	| 'system'
	| 'content.created'
	| 'content.updated'
	| 'content.published'
	| 'content.deleted'
	| 'user.registered'
	| 'user.login'
	| 'mention'
	| 'comment'
	| (string & NonNullable<unknown>)

/**
 * UI representation of a notification, derived from the API record.
 * `timestamp` is a `Date` for convenient use with date-formatting utilities.
 */
export type Notification = Omit<NotificationRecord, 'createdAt' | 'readAt'> & {
	timestamp: Date
	readAt?: Date
}

/**
 * Convert an API `NotificationRecord` to the UI `Notification` model.
 */
export function toNotification(record: NotificationRecord): Notification {
	return {
		...record,
		timestamp: new Date(record.createdAt),
		readAt: record.readAt ? new Date(record.readAt) : undefined,
	}
}
