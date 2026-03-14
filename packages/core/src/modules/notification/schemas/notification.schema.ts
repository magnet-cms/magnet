import { Field, Prop, Schema } from '@magnet-cms/common'
import type { NotificationChannel } from '@magnet-cms/common'

/**
 * Persisted notification record (platform channel).
 *
 * Uses `versioning: false` and `i18n: false` because notifications are
 * internal system records and should not be versioned or localized.
 * Hidden from the Content Manager with `visible: false`.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class Notification {
	/**
	 * ID of the user this notification belongs to.
	 */
	@Field.Text({ required: true })
	userId!: string

	/**
	 * Notification category / type identifier.
	 * Used for icon mapping and filtering in the UI.
	 */
	@Field.Text({ required: true })
	type!: string

	/**
	 * Short title shown in the notification list.
	 */
	@Field.Text({ required: true })
	title!: string

	/**
	 * Full description / body of the notification.
	 */
	@Field.Text({ required: true })
	message!: string

	/**
	 * Whether the user has read this notification.
	 */
	@Field.Boolean({ default: false })
	read = false

	/**
	 * Optional deep-link destination within the admin.
	 */
	@Field.Text()
	href?: string

	/**
	 * Which channels this notification was delivered through.
	 */
	@Prop({ type: [String] })
	channels!: NotificationChannel[]

	/**
	 * Delivery results per channel for observability.
	 */
	@Prop({ type: Object })
	channelResults?: Array<{
		channel: NotificationChannel
		success: boolean
		error?: string
	}>

	/**
	 * Additional arbitrary metadata.
	 */
	@Prop({ type: Object })
	metadata?: Record<string, unknown>

	/**
	 * When the notification was created.
	 */
	@Field.Date({ required: true, default: () => new Date() })
	createdAt!: Date

	/**
	 * When the notification was read (if applicable).
	 */
	@Field.Date()
	readAt?: Date
}
