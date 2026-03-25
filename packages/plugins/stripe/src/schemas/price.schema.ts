import { Field, Schema } from '@magnet-cms/common'

/**
 * Stripe Price — synced from Stripe via webhooks.
 * Represents a pricing option for a product.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class StripePrice {
  /** Stripe Price ID (price_...) */
  @Field.Text({ required: true, unique: true })
  stripePriceId!: string

  /** Reference to the StripeProduct.stripeProductId */
  @Field.Text({ required: true })
  productId!: string

  /** Price amount in the smallest currency unit (e.g., cents) */
  @Field.Number({ required: true })
  unitAmount!: number

  /** Three-letter ISO currency code (e.g., 'usd') */
  @Field.Text({ required: true })
  currency!: string

  /** Pricing type */
  @Field.Select({
    required: true,
    options: [
      { label: 'One-time', value: 'one_time' },
      { label: 'Recurring', value: 'recurring' },
    ],
  })
  type!: 'one_time' | 'recurring'

  /** Billing interval for recurring prices */
  @Field.Select({
    options: [
      { label: 'Day', value: 'day' },
      { label: 'Week', value: 'week' },
      { label: 'Month', value: 'month' },
      { label: 'Year', value: 'year' },
    ],
  })
  interval?: 'day' | 'week' | 'month' | 'year'

  /** Number of intervals between billings */
  @Field.Number()
  intervalCount?: number

  /** Whether this price is currently active */
  @Field.Boolean({ default: true })
  active = true
}
