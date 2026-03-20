import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { BadGatewayException } from '@nestjs/common'

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
const mockIsConfigured = mock(() => true)

const mockSentryApiService = {
	getProjectStats: mockGetProjectStats,
	getIssues: mockGetIssues,
	isConfigured: mockIsConfigured,
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
		mockGetIssues.mockClear()
		mockIsConfigured.mockClear()
	})

	it('should return stats with isConfigured true when API is set up', async () => {
		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		const result = await controller.getStats()

		expect(result.isConfigured).toBe(true)
		expect(result.totalErrors).toBe(100)
		expect(result.unresolvedIssues).toBe(10)
		expect(result.errorsLast24h).toBe(5)
	})

	it('should return isConfigured false when API not set up', async () => {
		mockIsConfigured.mockImplementationOnce(() => false)

		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		const result = await controller.getStats()

		expect(result.isConfigured).toBe(false)
		expect(result.totalErrors).toBe(0)
		expect(result.unresolvedIssues).toBe(0)
		expect(result.errorsLast24h).toBe(0)
		expect(mockGetProjectStats).not.toHaveBeenCalled()
	})

	it('should return issues list', async () => {
		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		const result = await controller.getIssues(undefined)

		expect(result).toHaveLength(1)
		expect(result[0]?.title).toBe('Test Error')
		expect(mockGetIssues).toHaveBeenCalledTimes(1)
	})

	it('should pass query param to getIssues()', async () => {
		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		await controller.getIssues('is:unresolved error')

		expect(mockGetIssues).toHaveBeenCalledWith('is:unresolved error')
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
		mockGetProjectStats.mockRejectedValueOnce(
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
		mockGetIssues.mockRejectedValueOnce(
			new BadGatewayException('Sentry API error: 403 Forbidden'),
		)

		const { SentryAdminController } = await importController()
		const controller = new SentryAdminController(mockSentryApiService as never)

		const result = await controller.getIssues(undefined)

		expect(result).toEqual([])
	})
})
