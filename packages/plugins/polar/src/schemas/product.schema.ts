import { Field, Prop, Schema } from '@magnet-cms/common'

/**
 * Polar Product — synced from Polar via webhooks.
 * Represents a product available for purchase.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class PolarProduct {
  /** Polar Product ID */
  @Field.Text({ required: true, unique: true })
  polarProductId!: string

  /** Product name */
  @Field.Text({ required: true })
  name!: string

  /** Product description */
  @Field.Text()
  description?: string

  /** Whether the product is a recurring subscription */
  @Field.Boolean({ default: false })
  isRecurring = false

  /** Whether the product is archived in Polar */
  @Field.Boolean({ default: false })
  isArchived = false

  /** Polar Organization ID */
  @Field.Text()
  organizationId?: string

  /** Arbitrary metadata from Polar */
  @Prop({ type: Object })
  metadata?: Record<string, string | number | boolean>

  /** When the product was last synced */
  @Field.Date({ required: true, default: () => new Date() })
  updatedAt!: Date
}
