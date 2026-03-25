/**
 * Configuration for the Stripe plugin.
 *
 * Passed via `PluginModule.forRoot({ plugins: [{ plugin: StripePlugin, options: { ... } }] })`
 * and injected in services via `@InjectPluginOptions('stripe')`.
 */
export interface StripePluginConfig {
  /** Stripe secret API key (sk_live_... or sk_test_...). Auto-resolved from STRIPE_SECRET_KEY env var. */
  secretKey?: string

  /** Stripe webhook signing secret (whsec_...). Auto-resolved from STRIPE_WEBHOOK_SECRET env var. */
  webhookSecret?: string

  /** Stripe publishable key (pk_live_... or pk_test_...) — exposed to frontend. Auto-resolved from STRIPE_PUBLISHABLE_KEY env var. */
  publishableKey?: string

  /** Whether to sync products/prices from Stripe via webhooks (default: true) */
  syncProducts?: boolean

  /** Whether to enable Customer Portal session creation (default: true) */
  portalEnabled?: boolean

  /** Default currency for checkout sessions (default: 'usd') */
  currency?: string

  /**
   * Feature flags per plan name.
   * Map of product/plan name to list of feature identifiers.
   *
   * @example
   * ```ts
   * {
   *   'pro': ['unlimited-servers', 'priority-support'],
   *   'basic': ['5-servers'],
   * }
   * ```
   */
  features?: Record<string, string[]>
}

/**
 * Response from the subscription access endpoint.
 */
export interface SubscriptionAccessResponse {
  /** Whether the user has an active subscription */
  hasActiveSubscription: boolean

  /** Plan/product name (null if no subscription) */
  plan: string | null

  /** When the current period ends (null if no subscription) */
  expiresAt: Date | null

  /** Feature flags for the user's plan */
  features: string[]
}

/**
 * Request body for creating a checkout session.
 */
export interface CreateCheckoutDto {
  /** Stripe Price ID to create checkout for */
  priceId: string

  /** URL to redirect to on success */
  successUrl: string

  /** URL to redirect to on cancel */
  cancelUrl: string

  /** Optional Magnet user ID to associate with the customer */
  userId?: string

  /** Optional metadata to attach to the checkout session */
  metadata?: Record<string, string>
}

/**
 * Request body for creating a customer portal session.
 */
export interface CreatePortalDto {
  /** Stripe Customer ID */
  customerId?: string

  /** Magnet user ID (used to look up customer if customerId not provided) */
  userId?: string

  /** URL to redirect to when the user is done */
  returnUrl?: string
}

/**
 * Response from creating a checkout or portal session.
 */
export interface SessionResponse {
  /** Session ID */
  sessionId: string

  /** URL to redirect the user to */
  url: string
}

/**
 * Admin metrics response from the dashboard endpoint.
 */
export interface StripeMetricsResponse {
  /** Monthly Recurring Revenue in cents */
  mrr: number

  /** Total revenue this month in cents */
  revenueThisMonth: number

  /** Number of active subscriptions */
  activeSubscriptions: number

  /** Churn rate as a percentage (0-100) */
  churnRate: number

  /** Revenue data for the last 12 months */
  revenueByMonth: Array<{
    month: string
    revenue: number
  }>

  /** Recent payments */
  recentPayments: Array<{
    id: string
    amount: number
    currency: string
    status: string
    customerEmail: string
    createdAt: string
  }>
}
