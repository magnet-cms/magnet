import { Field, Prop, Schema } from '@magnet-cms/common'

/**
 * Webhook delivery log schema.
 *
 * Records each outgoing HTTP request made by the webhook system,
 * including retries, response status, and errors. Hidden from Content Manager.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class WebhookDelivery {
	/**
	 * ID of the webhook that triggered this delivery.
	 */
	@Field.Text({ required: true })
	webhookId!: string

	/**
	 * Event name that triggered this delivery (e.g. 'content.created').
	 */
	@Field.Text({ required: true })
	event!: string

	/**
	 * Target URL the request was sent to.
	 */
	@Field.Text({ required: true })
	url!: string

	/**
	 * JSON payload sent in the request body.
	 */
	@Prop({ type: Object })
	payload?: Record<string, unknown>

	/**
	 * HTTP status code from the response (null if request failed).
	 */
	@Field.Number()
	statusCode?: number

	/**
	 * Response body (truncated to 1KB).
	 */
	@Field.Text()
	responseBody?: string

	/**
	 * Request duration in milliseconds.
	 */
	@Field.Number()
	duration?: number

	/**
	 * Whether the delivery was successful (2xx status code).
	 */
	@Field.Boolean({ default: false })
	success = false

	/**
	 * Error message if delivery failed.
	 */
	@Field.Text()
	error?: string

	/**
	 * Number of retry attempts made (0 = first attempt).
	 */
	@Field.Number({ default: 0 })
	retryCount = 0

	/**
	 * When this delivery was attempted.
	 */
	@Field.Date({ required: true, default: () => new Date() })
	createdAt!: Date
}
