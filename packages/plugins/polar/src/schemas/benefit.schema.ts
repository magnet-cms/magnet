import { Field, Schema } from '@magnet-cms/common'

/**
 * Polar Benefit — synced from Polar via webhooks.
 * Represents an entitlement attached to a product (license keys, downloads, Discord, etc.).
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class PolarBenefit {
  /** Polar Benefit ID */
  @Field.Text({ required: true, unique: true })
  polarBenefitId!: string

  /** Benefit type (license_keys, downloadables, discord, custom, github_repository, meter_credit, etc.) */
  @Field.Text({ required: true })
  type!: string

  /** Benefit description */
  @Field.Text()
  description?: string

  /** Polar Organization ID */
  @Field.Text()
  organizationId?: string

  /** Whether the benefit is selectable by the customer */
  @Field.Boolean({ default: false })
  selectable = false

  /** Whether the benefit can be deleted */
  @Field.Boolean({ default: true })
  deletable = true

  /** When the benefit was created */
  @Field.Date({ required: true, default: () => new Date() })
  createdAt!: Date
}
