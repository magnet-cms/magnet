import { Field, Prop, Schema } from '@magnet-cms/common'

/**
 * Stripe Customer — maps a Stripe customer to a Magnet user.
 * Synced from Stripe via webhooks.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class StripeCustomer {
  /** Stripe Customer ID (cus_...) */
  @Field.Text({ required: true, unique: true })
  stripeCustomerId!: string

  /** Customer email address */
  @Field.Email({ required: true })
  email!: string

  /** Customer display name */
  @Field.Text()
  name?: string

  /** Reference to the Magnet user ID */
  @Field.Text()
  userId?: string

  /** Arbitrary metadata from Stripe */
  @Prop({ type: Object })
  metadata?: Record<string, string>

  /** When the customer was created in Stripe */
  @Field.Date({ required: true, default: () => new Date() })
  createdAt!: Date
}
