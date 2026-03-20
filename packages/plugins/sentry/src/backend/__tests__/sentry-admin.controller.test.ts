import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { BadGatewayException } from '@nestjs/common'
import type { SentryProject, SentryTokenScopes } from '../types'

/**
 * NestJS HTTP method decorators (@Get, @Post, etc.) use the legacy 3-arg form
 * and throw on first import in Bun's TC39 stage-3 decorator context.
 * The class IS successfully cached after the first load, so subsequent imports
 * work correctly. We use a try/catch-then-retry pattern for the first import.
 */
async function importController() {
	try {
		return await import('../controllers/sentry-admin.controller')
	} catch {
		return await import('../controllers/sentry-admin.controller')
	}
}

const mockGetProjectStats = mock(async () => ({
	totalErrors: 100,
	unresolvedIssues: 10,
	errorsLast24h: 5,
}))
const mockGetIssues = mock(async () => [
	{
		id: '1',
		shortId: 'PROJ-1',
		title: 'Test Error',
		status: 'unresolved',
		count: '5',
		lastSeen: '2026-03-20T00:00:00Z',
		permalink: 'https://sentry.io/issues/1',
	},
])
const mockGetOrganizationProjects = mock(
	async (): Promise<SentryProject[]> => [
		{
			id: '1',
			slug: 'my-project',
			name: 'My Project',
			platform: 'node',
			status: 'active',
			dateCreated: '2024-01-01',
			isActive: true,
			errorCount: 42,
		},
		{
			id: '2',
			slug: 'other-project',
			name: 'Other Project',
			platform: 'python',
			status: 'active',
			dateCreated: '2024-01-02',
			isActive: false,
			errorCount: null,
		},
	],
)
const mockProbeTokenScopes = mock(
	async (): Promise<SentryTokenScopes> => ({
		orgRead: true,
		projectRead: true,
		eventRead: true,
		alertsRead: true,
	}),
)
const mockGetOrgStats = mock(async () => ({
	totalErrors: 200,
	unresolvedIssues: 20,
	errorsLast24h: 10,
}))
const mockGetOrgIssues = mock(async () => [
	{
		id: '2',
		shortId: 'ORG-1',
		title: 'Org Error',
		status: 'unresolved',
		count: '3',
		lastSeen: '2026-03-20T00:00:00Z',
		permalink: 'https://sentry.io/issues/2',
	},
])
const mockIsConfigured = mock(() => true)
const mockIsOrgConfigured = mock(() => true)

const mockSentryApiService = {
	getProjectStats: mockGetProjectStats,
	getOrgStats: mockGetOrgStats,
	getIssues: mockGetIssues,
	getOrgIssues: mockGetOrgIssues,
	getOrganizationProjects: mockGetOrganizationProjects,
	probeTokenScopes: mockProbeTokenScopes,
	isConfigured: mockIsConfigured,
	isOrgConfigured: mockIsOrgConfigured,
	get orgSlug() {
		return 'my-org'
	},
	get projectSlug() {
		return 'my-project'
	},
}

describe('SentryAdminController', () => {
	beforeEach(() => {
		mockGetProjectStats.mockClear()
		mockGetOrgStats.mockClear()
		mockGetIssues.mockClear()
		mockGetOrgIssues.mockClear()
		mockGetOrganizationProjects.mockClear()
		mockProbeTokenScopes.mockClear()
		mockIsConfigured.mockClear()
		mockIsOrgConfigured.mockClear()
	})

	it('should return org-level stats when no project param', async () => {
		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		const result = await controller.getStats()

		expect(result.isConfigured).toBe(true)
		expect(result.totalErrors).toBe(200)
		expect(result.unresolvedIssues).toBe(20)
		expect(result.errorsLast24h).toBe(10)
		expect(mockGetOrgStats).toHaveBeenCalledTimes(1)
		expect(mockGetProjectStats).not.toHaveBeenCalled()
	})

	it('should return isConfigured false when org not configured', async () => {
		mockIsOrgConfigured.mockImplementationOnce(() => false)

		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		const result = await controller.getStats()

		expect(result.isConfigured).toBe(false)
		expect(result.totalErrors).toBe(0)
		expect(result.unresolvedIssues).toBe(0)
		expect(result.errorsLast24h).toBe(0)
		expect(mockGetOrgStats).not.toHaveBeenCalled()
		expect(mockGetProjectStats).not.toHaveBeenCalled()
	})

	it('should return org issues when no project param', async () => {
		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		const result = await controller.getIssues(undefined, undefined)

		expect(result).toHaveLength(1)
		expect(result[0]?.title).toBe('Org Error')
		expect(mockGetOrgIssues).toHaveBeenCalledTimes(1)
		expect(mockGetIssues).not.toHaveBeenCalled()
	})

	it('should pass query param to getOrgIssues() when no project param', async () => {
		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		await controller.getIssues('is:unresolved error', undefined)

		expect(mockGetOrgIssues).toHaveBeenCalledWith('is:unresolved error')
		expect(mockGetIssues).not.toHaveBeenCalled()
	})

	it('should pass project param to getIssues() and use isOrgConfigured()', async () => {
		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		await controller.getIssues(undefined, 'other-project')

		expect(mockGetIssues).toHaveBeenCalledWith(undefined, 'other-project')
		expect(mockIsOrgConfigured).toHaveBeenCalled()
	})

	it('should pass project param to getStats() and use isOrgConfigured()', async () => {
		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		const result = await controller.getStats('other-project')

		expect(result.isConfigured).toBe(true)
		expect(mockGetProjectStats).toHaveBeenCalledWith('other-project')
		expect(mockIsOrgConfigured).toHaveBeenCalled()
	})

	it('should return status with connected true when configured', async () => {
		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		const result = await controller.getStatus()

		expect(result.connected).toBe(true)
		expect(result.organization).toBe('my-org')
		expect(result.project).toBe('my-project')
	})

	it('should return status with connected false when not configured', async () => {
		mockIsConfigured.mockImplementationOnce(() => false)

		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		const result = await controller.getStatus()

		expect(result.connected).toBe(false)
	})

	it('should return zeros and apiError when Sentry API returns Bad Gateway', async () => {
		mockGetOrgStats.mockRejectedValueOnce(
			new BadGatewayException('Sentry API error: 403 Forbidden'),
		)

		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		const result = await controller.getStats()

		expect(result.isConfigured).toBe(true)
		expect(result.apiError).toContain('403')
		expect(result.totalErrors).toBe(0)
		expect(result.unresolvedIssues).toBe(0)
		expect(result.errorsLast24h).toBe(0)
	})

	it('should return empty issues when Sentry API returns Bad Gateway', async () => {
		mockGetOrgIssues.mockRejectedValueOnce(
			new BadGatewayException('Sentry API error: 403 Forbidden'),
		)

		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		const result = await controller.getIssues(undefined, undefined)

		expect(result).toEqual([])
	})

	// =========================================================================
	// GET /sentry/admin/projects
	// =========================================================================

	it('should return org projects list', async () => {
		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		const result = await controller.getProjects()

		expect(result).toHaveLength(2)
		expect(result[0]?.slug).toBe('my-project')
		expect(result[0]?.isActive).toBe(true)
		expect(result[1]?.isActive).toBe(false)
		expect(mockGetOrganizationProjects).toHaveBeenCalledTimes(1)
	})

	it('should return empty array when org not configured for getProjects()', async () => {
		mockIsOrgConfigured.mockImplementationOnce(() => false)

		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		const result = await controller.getProjects()

		expect(result).toEqual([])
		expect(mockGetOrganizationProjects).not.toHaveBeenCalled()
	})

	it('should return empty array when getProjects() throws BadGatewayException', async () => {
		mockGetOrganizationProjects.mockRejectedValueOnce(
			new BadGatewayException('Sentry API error: 403 Forbidden'),
		)

		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		const result = await controller.getProjects()

		expect(result).toEqual([])
	})

	// =========================================================================
	// GET /sentry/admin/scopes
	// =========================================================================

	it('should return token scopes', async () => {
		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		const result = await controller.getScopes()

		expect(result.orgRead).toBe(true)
		expect(result.projectRead).toBe(true)
		expect(result.eventRead).toBe(true)
		expect(result.alertsRead).toBe(true)
		expect(mockProbeTokenScopes).toHaveBeenCalledTimes(1)
	})

	it('should return all-false scopes when org not configured', async () => {
		mockIsOrgConfigured.mockImplementationOnce(() => false)

		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		const result = await controller.getScopes()

		expect(result.orgRead).toBe(false)
		expect(result.projectRead).toBe(false)
		expect(result.eventRead).toBe(false)
		expect(result.alertsRead).toBe(false)
		expect(mockProbeTokenScopes).not.toHaveBeenCalled()
	})

	it('should return all-false scopes when probeTokenScopes() throws BadGatewayException', async () => {
		mockProbeTokenScopes.mockRejectedValueOnce(
			new BadGatewayException('Sentry API error: 403 Forbidden'),
		)

		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		const result = await controller.getScopes()

		expect(result.orgRead).toBe(false)
		expect(result.projectRead).toBe(false)
		expect(result.eventRead).toBe(false)
		expect(result.alertsRead).toBe(false)
	})
})
