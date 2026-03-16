import { Field, Prop, Schema } from '@magnet-cms/common'

/**
 * Polar Customer — maps a Polar customer to a Magnet user.
 * Synced from Polar via webhooks.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class PolarCustomer {
	/** Polar Customer ID */
	@Field.Text({ required: true, unique: true })
	polarCustomerId!: string

	/** Customer email address */
	@Field.Email({ required: true })
	email!: string

	/** Customer display name */
	@Field.Text()
	name?: string

	/** Reference to the Magnet user ID (via Polar externalId) */
	@Field.Text()
	userId?: string

	/** Arbitrary metadata from Polar */
	@Prop({ type: Object })
	metadata?: Record<string, string | number | boolean>

	/** When the customer was created in Polar */
	@Field.Date({ required: true, default: () => new Date() })
	createdAt!: Date
}
