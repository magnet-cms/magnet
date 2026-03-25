/**
 * Configuration for the Polar plugin.
 *
 * Passed via `PluginModule.forRoot({ plugins: [{ plugin: PolarPlugin, options: { ... } }] })`
 * and injected in services via `@InjectPluginOptions('polar')`.
 */
export interface PolarPluginConfig {
  /** Polar access token (polar_at_...). Auto-resolved from POLAR_ACCESS_TOKEN env var. */
  accessToken?: string

  /** Polar webhook signing secret. Auto-resolved from POLAR_WEBHOOK_SECRET env var. */
  webhookSecret?: string

  /** Polar organization ID. Auto-resolved from POLAR_ORGANIZATION_ID env var. */
  organizationId?: string

  /** Whether to sync products from Polar via webhooks (default: true) */
  syncProducts?: boolean

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
  /** List of Polar Product IDs to offer at checkout */
  products: string[]

  /** URL to redirect to on success */
  successUrl?: string

  /** URL to redirect to when customer clicks back */
  returnUrl?: string

  /** Optional customer email to pre-fill */
  customerEmail?: string

  /** Optional Magnet user ID to associate with the customer via externalCustomerId */
  userId?: string

  /** Optional metadata to attach to the checkout session */
  metadata?: Record<string, string>
}

/**
 * Request body for creating a customer portal session.
 */
export interface CreatePortalDto {
  /** Polar Customer ID */
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
export interface PolarMetricsResponse {
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

  /** Recent orders */
  recentOrders: Array<{
    id: string
    totalAmount: number
    currency: string
    status: string
    customerEmail: string
    createdAt: string
  }>
}
