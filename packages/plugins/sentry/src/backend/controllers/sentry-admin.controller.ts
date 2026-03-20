import { RestrictedRoute } from '@magnet-cms/core'
import {
	BadGatewayException,
	Controller,
	Get,
	HttpException,
	Query,
} from '@nestjs/common'
import { SentryApiService } from '../services/sentry-api.service'
import type { SentryAdminStatsResponse, SentryIssue } from '../types'

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
	 * Returns zeroes with isConfigured:false when auth token is not set.
	 */
	@Get('admin/stats')
	@RestrictedRoute()
	async getStats(): Promise<SentryAdminStatsResponse> {
		if (!this.sentryApi.isConfigured()) {
			return {
				isConfigured: false,
				totalErrors: 0,
				unresolvedIssues: 0,
				errorsLast24h: 0,
			}
		}

		try {
			const stats = await this.sentryApi.getProjectStats()
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
	 * Returns list of Sentry issues. Optional ?query= param for search.
	 */
	@Get('admin/issues')
	@RestrictedRoute()
	async getIssues(
		@Query('query') query: string | undefined,
	): Promise<SentryIssue[]> {
		if (!this.sentryApi.isConfigured()) {
			return []
		}
		try {
			return await this.sentryApi.getIssues(query)
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
}
