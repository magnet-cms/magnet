/**
 * Notification System Type Definitions
 *
 * Shared types used by core backend and admin client for the notifications system.
 */

/**
 * Available notification delivery channels.
 * - `platform`: Persists notification in DB, shown in admin drawer.
 * - `email`: Sends an email to the user (requires an adapter registered).
 */
export type NotificationChannel = 'platform' | 'email'

/**
 * Result of delivering a notification via a single channel.
 */
export interface NotificationChannelResult {
  channel: NotificationChannel
  success: boolean
  error?: string
}

/**
 * Interface that any notification channel adapter must implement.
 * Register adapters in `NotificationModule.forRoot({ adapters: [...] })`.
 */
export interface NotificationChannelAdapter {
  /** Which channel this adapter handles */
  readonly channel: NotificationChannel

  /**
   * Deliver a notification to a recipient.
   * @param payload - Notification data to send
   * @param recipient - Target user info (userId always present; email populated when available)
   */
  send(
    payload: NotificationSendPayload,
    recipient: NotificationRecipient,
  ): Promise<NotificationChannelResult>
}

/**
 * Minimal notification data passed to channel adapters for delivery.
 */
export interface NotificationSendPayload {
  id: string
  type: string
  title: string
  message: string
  href?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

/**
 * Recipient info resolved when delivering a notification.
 */
export interface NotificationRecipient {
  userId: string
  email?: string
  name?: string
}

/**
 * DTO used to send a notification through NotificationService.notify().
 */
export interface NotifyDto {
  /** Target user ID. Can be a single user or a list for bulk delivery. */
  userId: string | string[]
  /**
   * Which channels to deliver to.
   * Defaults to `['platform']` when not specified.
   */
  channels?: NotificationChannel[]
  /**
   * Notification category / type identifier.
   * Useful for filtering and icon mapping in the UI.
   */
  type: string
  /** Short title shown in the notification list. */
  title: string
  /** Longer description or body of the notification. */
  message: string
  /** Optional link the user will be taken to when clicking the notification. */
  href?: string
  /**
   * Additional arbitrary metadata stored with the notification.
   * Not shown directly in UI but available for custom logic.
   */
  metadata?: Record<string, unknown>
}

/**
 * Options for querying a user's notifications.
 */
export interface NotificationQueryOptions {
  /** Filter to only unread notifications. */
  unreadOnly?: boolean
  /** Maximum number of results. Defaults to 20. */
  limit?: number
  /** Number of results to skip for pagination. */
  offset?: number
}

/**
 * Paginated response for notification lists.
 */
export interface PaginatedNotifications<T> {
  items: T[]
  total: number
  unreadCount: number
  limit: number
  offset: number
}
