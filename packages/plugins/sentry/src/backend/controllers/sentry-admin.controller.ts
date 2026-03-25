import { RestrictedRoute } from '@magnet-cms/core'
import { BadGatewayException, Controller, Get, HttpException, Query } from '@nestjs/common'

import { SentryApiService } from '../services/sentry-api.service'
import type {
  SentryAdminStatsResponse,
  SentryIssue,
  SentryProject,
  SentryTokenScopes,
} from '../types'

function messageFromHttpException(e: HttpException): string {
  const r = e.getResponse()
  if (typeof r === 'string') return r
  if (r && typeof r === 'object' && 'message' in r) {
    const m = (r as { message: string | string[] }).message
    return Array.isArray(m) ? m.join(' ') : String(m)
  }
  return e.message
}

interface SentryStatusResponse {
  connected: boolean
  organization: string | undefined
  project: string | undefined
  lastSync: string | null
}

/**
 * Admin API endpoints for the Sentry dashboard.
 *
 * All endpoints require authentication via @RestrictedRoute().
 * Data is proxied from the Sentry Web API via SentryApiService.
 * When the API is not configured, endpoints return graceful empty states.
 */
@Controller('sentry')
export class SentryAdminController {
  constructor(private readonly sentryApi: SentryApiService) {}

  /**
   * GET /sentry/admin/stats
   * Returns error metrics for the dashboard: totals, unresolved count, 24h errors.
   * Optional ?project= overrides the configured SENTRY_PROJECT.
   * Returns zeroes with isConfigured:false when auth token is not set.
   */
  @Get('admin/stats')
  @RestrictedRoute()
  async getStats(@Query('project') project?: string): Promise<SentryAdminStatsResponse> {
    if (!this.sentryApi.isOrgConfigured()) {
      return {
        isConfigured: false,
        totalErrors: 0,
        unresolvedIssues: 0,
        errorsLast24h: 0,
      }
    }

    try {
      const stats = project
        ? await this.sentryApi.getProjectStats(project)
        : await this.sentryApi.getOrgStats()
      return { isConfigured: true, ...stats }
    } catch (e) {
      if (e instanceof BadGatewayException) {
        return {
          isConfigured: true,
          apiError: messageFromHttpException(e),
          totalErrors: 0,
          unresolvedIssues: 0,
          errorsLast24h: 0,
        }
      }
      throw e
    }
  }

  /**
   * GET /sentry/admin/issues
   * Returns list of Sentry issues. Optional ?query= for search, ?project= to override project.
   */
  @Get('admin/issues')
  @RestrictedRoute()
  async getIssues(
    @Query('query') query: string | undefined,
    @Query('project') project?: string,
  ): Promise<SentryIssue[]> {
    if (!this.sentryApi.isOrgConfigured()) {
      return []
    }
    try {
      return project
        ? await this.sentryApi.getIssues(query, project)
        : await this.sentryApi.getOrgIssues(query)
    } catch (e) {
      if (e instanceof BadGatewayException) {
        return []
      }
      throw e
    }
  }

  /**
   * GET /sentry/admin/status
   * Returns API connectivity status for the settings page.
   */
  @Get('admin/status')
  @RestrictedRoute()
  async getStatus(): Promise<SentryStatusResponse> {
    const connected = this.sentryApi.isConfigured()
    return {
      connected,
      organization: this.sentryApi.orgSlug,
      project: this.sentryApi.projectSlug,
      lastSync: connected ? new Date().toISOString() : null,
    }
  }

  /**
   * GET /sentry/admin/projects
   * Returns all projects in the organization, with isActive flag for the
   * configured project and errorCount from 24h stats.
   * Returns empty array when org is not configured or Sentry API errors.
   */
  @Get('admin/projects')
  @RestrictedRoute()
  async getProjects(): Promise<SentryProject[]> {
    if (!this.sentryApi.isOrgConfigured()) {
      return []
    }
    try {
      return await this.sentryApi.getOrganizationProjects()
    } catch (e) {
      if (e instanceof BadGatewayException) {
        return []
      }
      throw e
    }
  }

  /**
   * GET /sentry/admin/scopes
   * Returns detected token scope availability by probing known Sentry endpoints.
   * Results are cached for 5 minutes on the service.
   * Returns all-false when org is not configured.
   */
  @Get('admin/scopes')
  @RestrictedRoute()
  async getScopes(): Promise<SentryTokenScopes> {
    const allFalse: SentryTokenScopes = {
      orgRead: false,
      projectRead: false,
      eventRead: false,
      alertsRead: false,
    }
    if (!this.sentryApi.isOrgConfigured()) {
      return allFalse
    }
    try {
      return await this.sentryApi.probeTokenScopes()
    } catch (e) {
      if (e instanceof BadGatewayException) {
        return allFalse
      }
      throw e
    }
  }
}
