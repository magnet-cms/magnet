import { BadGatewayException, Inject, Injectable } from '@nestjs/common'

import { SENTRY_OPTIONS } from '../constants'
import type {
  SentryIssue,
  SentryPluginConfig,
  SentryProject,
  SentryProjectStats,
  SentryTokenScopes,
} from '../types'

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

/**
 * Derive the Sentry Web API origin from the DSN ingest hostname.
 * US/EU data storage uses region-specific API hosts; defaulting to sentry.io
 * against a US ingest DSN often yields 403 on REST calls.
 */
function inferSentryApiBaseUrlFromDsn(dsn: string | undefined): string | undefined {
  if (!dsn?.trim()) return undefined
  try {
    const host = new URL(dsn).hostname
    if (host.includes('.ingest.us.sentry.io')) return 'https://us.sentry.io'
    if (host.includes('.ingest.de.sentry.io')) return 'https://de.sentry.io'
    return undefined
  } catch {
    return undefined
  }
}

function sentryApiFailureMessage(status: number, statusText: string): string {
  const base = `Sentry API error: ${status} ${statusText}`
  if (status === 401 || status === 403) {
    return `${base}. Check SENTRY_AUTH_TOKEN scopes (e.g. org:read, project:read), that SENTRY_ORG and SENTRY_PROJECT are URL slugs (not numeric IDs), and SENTRY_URL matches your region (e.g. https://us.sentry.io when the DSN uses ingest.us.sentry.io).`
  }
  if (status === 404) {
    return `${base}. Check SENTRY_ORG and SENTRY_PROJECT slugs and SENTRY_URL.`
  }
  return base
}

/** Raw project shape from GET /api/0/organizations/{org}/projects/ */
interface RawSentryProject {
  id: string
  slug: string
  name: string
  platform: string | null
  status: string
  dateCreated: string
  stats?: [number, number][]
}

/**
 * Sentry REST API proxy service.
 *
 * Proxies requests to the Sentry Web API using an auth token.
 * Caches responses for 60 seconds to avoid rate limiting.
 *
 * Requires `authToken`, `organization`, and `project` in config.
 * Use `isConfigured()` to check before calling API methods.
 * Use `isOrgConfigured()` to check org-level access (no project required).
 */
@Injectable()
export class SentryApiService {
  private readonly cache = new Map<string, CacheEntry<unknown>>()
  private scopeCache: CacheEntry<SentryTokenScopes> | undefined
  private readonly baseUrl: string
  private readonly authToken: string | undefined
  private readonly organization: string | undefined
  private readonly project: string | undefined

  constructor(@Inject(SENTRY_OPTIONS) config: Partial<SentryPluginConfig>) {
    this.baseUrl =
      config.sentryUrl ?? inferSentryApiBaseUrlFromDsn(config.dsn) ?? 'https://sentry.io'
    this.authToken = config.authToken
    this.organization = config.organization
    this.project = config.project
  }

  /** Returns true when all required fields for API access are configured. */
  isConfigured(): boolean {
    return !!(this.authToken && this.organization && this.project)
  }

  /** Returns true when org-level API access is configured (no project required). */
  isOrgConfigured(): boolean {
    return !!(this.authToken && this.organization)
  }

  get orgSlug(): string | undefined {
    return this.organization
  }
  get projectSlug(): string | undefined {
    return this.project
  }

  /**
   * Fetch org-level aggregate stats across all projects.
   * Uses the org issues endpoint — no project slug required.
   */
  async getOrgStats(): Promise<SentryProjectStats> {
    if (!this.isOrgConfigured()) {
      throw new Error('Sentry API not configured: authToken and organization are required')
    }

    const issuesUrl = `${this.baseUrl}/api/0/organizations/${this.organization}/issues/?query=is:unresolved&limit=100`
    const issues = await this.fetchCached<SentryIssue[]>(issuesUrl)

    const unresolvedIssues = issues.length
    const totalErrors = issues.reduce((sum, issue) => sum + Number(issue.count || 0), 0)
    const cutoff24h = Date.now() - 86_400_000
    const errorsLast24h = issues.filter(
      (issue) => new Date(issue.lastSeen).getTime() > cutoff24h,
    ).length

    return { totalErrors, unresolvedIssues, errorsLast24h }
  }

  /**
   * Fetch issues from the Sentry organization (all projects).
   * @param query - Optional Sentry search query (default: 'is:unresolved')
   */
  async getOrgIssues(query = 'is:unresolved'): Promise<SentryIssue[]> {
    if (!this.isOrgConfigured()) {
      throw new Error('Sentry API not configured: authToken and organization are required')
    }

    const url = `${this.baseUrl}/api/0/organizations/${this.organization}/issues/?query=${encodeURIComponent(query)}&limit=25`
    return this.fetchCached<SentryIssue[]>(url)
  }

  /**
   * Fetch project-level stats: total errors, unresolved issues, errors last 24h.
   * Derives all stats from the issues endpoint to keep it a single API call.
   * @param projectSlug - Override the configured project slug.
   * Throws if not configured.
   */
  async getProjectStats(projectSlug?: string): Promise<SentryProjectStats> {
    const project = projectSlug ?? this.project
    if (!this.authToken || !this.organization || !project) {
      throw new Error(
        'Sentry API not configured: authToken, organization, and project are required',
      )
    }

    const issuesUrl = `${this.baseUrl}/api/0/projects/${this.organization}/${project}/issues/?query=is:unresolved&limit=100`
    const issues = await this.fetchCached<SentryIssue[]>(issuesUrl)

    const unresolvedIssues = issues.length
    const totalErrors = issues.reduce((sum, issue) => sum + Number(issue.count || 0), 0)

    // Count issues that have been seen in the last 24 hours
    const cutoff24h = Date.now() - 86_400_000
    const errorsLast24h = issues.filter(
      (issue) => new Date(issue.lastSeen).getTime() > cutoff24h,
    ).length

    return { totalErrors, unresolvedIssues, errorsLast24h }
  }

  /**
   * Fetch issues from the Sentry project.
   * @param query - Optional Sentry search query (default: 'is:unresolved')
   * @param projectSlug - Override the configured project slug.
   */
  async getIssues(query = 'is:unresolved', projectSlug?: string): Promise<SentryIssue[]> {
    const project = projectSlug ?? this.project
    if (!this.authToken || !this.organization || !project) {
      throw new Error(
        'Sentry API not configured: authToken, organization, and project are required',
      )
    }

    const url = `${this.baseUrl}/api/0/projects/${this.organization}/${project}/issues/?query=${encodeURIComponent(query)}&limit=25`
    return this.fetchCached<SentryIssue[]>(url)
  }

  /**
   * Fetch all projects in the organization.
   * Requires authToken and organization (project not required).
   * Sets isActive=true for the project matching the configured SENTRY_PROJECT.
   * Populates errorCount from embedded stats if the API returns them.
   */
  async getOrganizationProjects(): Promise<SentryProject[]> {
    if (!this.isOrgConfigured()) {
      throw new Error('Sentry API not configured: authToken and organization are required')
    }

    const url = `${this.baseUrl}/api/0/organizations/${this.organization}/projects/?statsPeriod=24h`
    const raw = await this.fetchCached<RawSentryProject[]>(url)

    return raw.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      platform: p.platform,
      status: p.status,
      dateCreated: p.dateCreated,
      isActive: p.slug === this.project,
      errorCount: p.stats ? p.stats.reduce((sum, [, count]) => sum + count, 0) : null,
    }))
  }

  /**
   * Probe token scopes by making lightweight requests to known Sentry endpoints.
   * Results are cached for 5 minutes.
   *
   * Probed scopes: org:read, project:read, event:read, alerts:read
   * Non-200/non-403 responses are treated as scope unavailable.
   * event:read probe is skipped when project is not configured.
   */
  async probeTokenScopes(): Promise<SentryTokenScopes> {
    const allFalse: SentryTokenScopes = {
      orgRead: false,
      projectRead: false,
      eventRead: false,
      alertsRead: false,
    }
    if (!this.isOrgConfigured()) {
      return allFalse
    }
    if (this.scopeCache && this.scopeCache.expiresAt > Date.now()) {
      return this.scopeCache.data
    }

    const probe = async (url: string): Promise<boolean> => {
      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${this.authToken}` },
        })
        return response.status === 200
      } catch {
        return false
      }
    }

    const [orgRead, projectRead, alertsRead] = await Promise.all([
      probe(`${this.baseUrl}/api/0/organizations/${this.organization}/`),
      probe(`${this.baseUrl}/api/0/organizations/${this.organization}/projects/?per_page=1`),
      probe(`${this.baseUrl}/api/0/organizations/${this.organization}/alert-rules/?per_page=1`),
    ])

    // event:read requires project to be configured
    const eventRead = this.isConfigured()
      ? await probe(
          `${this.baseUrl}/api/0/projects/${this.organization}/${this.project}/issues/?limit=1`,
        )
      : false

    const scopes: SentryTokenScopes = {
      orgRead,
      projectRead,
      eventRead,
      alertsRead,
    }
    this.scopeCache = { data: scopes, expiresAt: Date.now() + 300_000 }
    return scopes
  }

  private async fetchCached<T>(url: string): Promise<T> {
    const cached = this.cache.get(url) as CacheEntry<T> | undefined
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new BadGatewayException(sentryApiFailureMessage(response.status, response.statusText))
    }

    const data = (await response.json()) as T
    this.cache.set(url, { data, expiresAt: Date.now() + 60_000 })
    return data
  }
}
