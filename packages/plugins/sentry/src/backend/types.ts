/**
 * Configuration for the Sentry plugin.
 *
 * Passed via `SentryPlugin.forRoot({ ... })` and injected in services via
 * the `SENTRY_OPTIONS` token.
 *
 * All fields are optional — DSN is auto-resolved from the `SENTRY_DSN`
 * environment variable when not provided.
 */
export interface SentryPluginConfig {
  /**
   * Sentry DSN (Data Source Name).
   * Auto-resolved from `SENTRY_DSN` environment variable if not provided.
   * @example 'https://abc123@o0.ingest.sentry.io/12345'
   */
  dsn?: string

  /**
   * Sample rate for performance tracing (0.0 to 1.0).
   * Set to 1.0 in development, 0.1 in production to reduce overhead.
   * @default 0.1
   */
  tracesSampleRate?: number

  /**
   * Sample rate for profiling sessions (0.0 to 1.0).
   * Requires `@sentry/profiling-node` peer dependency.
   * @default 1.0
   */
  profileSessionSampleRate?: number

  /**
   * The deployment environment (e.g., 'production', 'staging', 'development').
   * Auto-resolved from `NODE_ENV` or `SENTRY_ENVIRONMENT` if not provided.
   */
  environment?: string

  /**
   * The release version string (e.g., 'v1.0.0' or a git SHA).
   * Auto-resolved from `SENTRY_RELEASE` if not provided.
   */
  release?: string

  /**
   * Enable Sentry debug mode — logs Sentry SDK activity to the console.
   * @default false
   */
  debug?: boolean

  /**
   * Whether Sentry is enabled. Set to `false` to disable all Sentry activity.
   * Useful to disable in test environments.
   * @default true
   */
  enabled?: boolean

  /**
   * Attach stack traces to all captured events, not just errors.
   * @default true
   */
  attachStacktrace?: boolean

  /**
   * Maximum number of breadcrumbs to store.
   * @default 100
   */
  maxBreadcrumbs?: number

  // =========================================================================
  // Sentry API access (for admin dashboard data)
  // =========================================================================

  /**
   * Sentry API auth token for fetching issues and project stats.
   * Auto-resolved from `SENTRY_AUTH_TOKEN` environment variable.
   * Required for the admin dashboard to display error metrics.
   */
  authToken?: string

  /**
   * Sentry organization slug.
   * Auto-resolved from `SENTRY_ORG` environment variable.
   * @example 'my-company'
   */
  organization?: string

  /**
   * Sentry project slug.
   * Auto-resolved from `SENTRY_PROJECT` environment variable.
   * @example 'my-app'
   */
  project?: string

  /**
   * Sentry Web API base URL for admin dashboard proxying.
   * Defaults to `https://sentry.io`, or inferred from the DSN ingest host
   * (e.g. `https://us.sentry.io` when the DSN uses `ingest.us.sentry.io`).
   * Override for self-hosted or non-default regions.
   * Auto-resolved from `SENTRY_URL` environment variable.
   */
  sentryUrl?: string
}

/**
 * Response shape from GET /sentry/config endpoint.
 * Used by the frontend to initialize the Sentry Browser SDK.
 */
export interface SentryClientConfig {
  /** Public Sentry DSN — safe to expose to authenticated admin users */
  dsn: string
  /** Whether Sentry is enabled */
  enabled: boolean
  /** Deployment environment */
  environment: string
}

/**
 * A Sentry issue as returned by GET /api/0/projects/{org}/{project}/issues/
 */
export interface SentryIssue {
  id: string
  shortId: string
  title: string
  status: 'resolved' | 'unresolved' | 'ignored'
  count: string
  lastSeen: string
  firstSeen?: string
  permalink: string
  assignedTo?: { name: string; email?: string } | null
  level?: string
}

/**
 * Project stats summary derived from Sentry API responses.
 */
export interface SentryProjectStats {
  totalErrors: number
  unresolvedIssues: number
  errorsLast24h: number
}

/**
 * Response from GET /sentry/admin/stats
 */
export interface SentryAdminStatsResponse extends SentryProjectStats {
  isConfigured: boolean
  /** Set when credentials are present but the Sentry Web API rejects the request */
  apiError?: string
}

/**
 * A Sentry project in an organization, as returned by
 * GET /api/0/organizations/{org}/projects/
 */
export interface SentryProject {
  id: string
  slug: string
  name: string
  platform: string | null
  status: string
  dateCreated: string
  /** True when this project matches the configured SENTRY_PROJECT */
  isActive: boolean
  /** Sum of errors in the last 24h, or null if stats were not returned by the API */
  errorCount: number | null
}

/**
 * Token scope availability as detected by probing known Sentry API endpoints.
 */
export interface SentryTokenScopes {
  /** Whether the token can read organization data (org:read scope) */
  orgRead: boolean
  /** Whether the token can read project list (project:read scope) */
  projectRead: boolean
  /** Whether the token can read events/issues (event:read scope) */
  eventRead: boolean
  /** Whether the token can read alert rules (alerts:read scope) */
  alertsRead: boolean
}
