import { Field, Schema } from '@magnet-cms/common'

/**
 * Polar Benefit Grant — synced from Polar via webhooks.
 * Represents an instance of a benefit granted to a specific customer.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class PolarBenefitGrant {
  /** Polar Benefit Grant ID */
  @Field.Text({ required: true, unique: true })
  polarBenefitGrantId!: string

  /** Reference to PolarBenefit.polarBenefitId */
  @Field.Text({ required: true })
  benefitId!: string

  /** Reference to PolarCustomer.polarCustomerId */
  @Field.Text({ required: true })
  customerId!: string

  /** Reference to PolarSubscription.polarSubscriptionId (optional) */
  @Field.Text()
  subscriptionId?: string

  /** Whether the benefit is currently granted */
  @Field.Boolean({ default: true })
  isGranted = true

  /** Whether the benefit has been revoked */
  @Field.Boolean({ default: false })
  isRevoked = false

  /** When the benefit was granted */
  @Field.Date()
  grantedAt?: Date

  /** When the benefit was revoked (null if still active) */
  @Field.Date()
  revokedAt?: Date
}
