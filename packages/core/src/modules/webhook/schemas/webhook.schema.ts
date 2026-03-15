import { Field, Prop, Schema } from '@magnet-cms/common'

/**
 * Webhook configuration schema.
 *
 * Stores admin-configured outgoing HTTP webhooks that fire
 * on system events. Hidden from Content Manager.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class Webhook {
	/**
	 * Human-readable name for this webhook.
	 */
	@Field.Text({ required: true })
	name!: string

	/**
	 * Target URL to POST event data to.
	 */
	@Field.Text({ required: true })
	url!: string

	/**
	 * Optional description for documentation purposes.
	 */
	@Field.Text()
	description?: string

	/**
	 * Event names this webhook subscribes to (e.g. 'content.created', 'user.login').
	 */
	@Prop({ type: [String] })
	events!: string[]

	/**
	 * HMAC-SHA256 secret for request signing.
	 * Used to compute the X-Magnet-Signature header.
	 */
	@Field.Text({ required: true })
	secret!: string

	/**
	 * Custom HTTP headers to include in outgoing requests.
	 */
	@Prop({ type: Object })
	headers?: Record<string, string>

	/**
	 * Whether this webhook is active. Disabled webhooks are not dispatched.
	 */
	@Field.Boolean({ default: true })
	enabled = true

	/**
	 * When this webhook was created.
	 */
	@Field.Date({ required: true, default: () => new Date() })
	createdAt!: Date

	/**
	 * When this webhook was last updated.
	 */
	@Field.Date({ required: true, default: () => new Date() })
	updatedAt!: Date
}
