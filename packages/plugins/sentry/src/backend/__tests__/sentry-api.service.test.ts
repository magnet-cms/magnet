import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { BadGatewayException } from '@nestjs/common'

describe('SentryApiService', () => {
	let originalFetch: typeof globalThis.fetch

	beforeEach(() => {
		originalFetch = globalThis.fetch
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
	})

	it('should report isConfigured() false when authToken is missing', async () => {
		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			organization: 'my-org',
			project: 'my-project',
		})
		expect(service.isConfigured()).toBe(false)
	})

	it('should report isConfigured() false when organization is missing', async () => {
		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'token',
			project: 'my-project',
		})
		expect(service.isConfigured()).toBe(false)
	})

	it('should report isConfigured() false when project is missing', async () => {
		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'token',
			organization: 'my-org',
		})
		expect(service.isConfigured()).toBe(false)
	})

	it('should report isConfigured() true when all required fields are set', async () => {
		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'token',
			organization: 'my-org',
			project: 'my-project',
		})
		expect(service.isConfigured()).toBe(true)
	})

	it('should call Sentry API with correct URL and auth header for getProjectStats()', async () => {
		const mockIssues = [
			{
				id: '1',
				title: 'Error',
				status: 'unresolved',
				count: '5',
				lastSeen: new Date().toISOString(),
				shortId: 'P-1',
				permalink: 'https://sentry.io',
			},
		]
		const mockFetch = mock(async (_url: string, _opts: unknown) =>
			Response.json(mockIssues),
		)
		globalThis.fetch = mockFetch as typeof globalThis.fetch

		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'my-token',
			organization: 'my-org',
			project: 'my-project',
		})
		await service.getProjectStats()

		expect(mockFetch).toHaveBeenCalledTimes(1)
		const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
		expect(url).toContain('/api/0/projects/my-org/my-project/')
		expect((opts.headers as Record<string, string>).Authorization).toBe(
			'Bearer my-token',
		)
	})

	it('should call Sentry API with correct URL for getIssues()', async () => {
		const mockIssues = [
			{
				id: '1',
				title: 'Error',
				status: 'unresolved',
				count: '5',
				lastSeen: '2026-01-01',
				shortId: 'PROJ-1',
				permalink: 'https://sentry.io/issues/1',
			},
		]
		const mockFetch = mock(async () => Response.json(mockIssues))
		globalThis.fetch = mockFetch as typeof globalThis.fetch

		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'my-token',
			organization: 'my-org',
			project: 'my-project',
		})
		const result = await service.getIssues()

		expect(mockFetch).toHaveBeenCalledTimes(1)
		const [url] = mockFetch.mock.calls[0] as [string, unknown]
		expect(url).toContain('/api/0/projects/my-org/my-project/issues/')
		expect(result).toHaveLength(1)
		expect(result[0]?.title).toBe('Error')
	})

	// Each `new SentryApiService({...})` creates a fresh Map instance for the cache,
	// so tests are isolated even though Bun caches the imported module itself.
	it('should return cached result on second call within 60s', async () => {
		const mockFetch = mock(async () =>
			Response.json([
				{
					id: '1',
					title: 'Error',
					status: 'unresolved',
					count: '1',
					lastSeen: '2026-01-01',
					shortId: 'P-1',
					permalink: 'https://sentry.io',
				},
			]),
		)
		globalThis.fetch = mockFetch as typeof globalThis.fetch

		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'tok',
			organization: 'org',
			project: 'proj',
		})
		await service.getIssues()
		await service.getIssues()

		// fetch should only be called once due to caching
		expect(mockFetch).toHaveBeenCalledTimes(1)
	})

	it('should throw when not configured and getIssues() called', async () => {
		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({})
		await expect(service.getIssues()).rejects.toThrow()
	})

	it('should use custom sentryUrl when provided', async () => {
		const mockFetch = mock(async () => Response.json([]))
		globalThis.fetch = mockFetch as typeof globalThis.fetch

		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'tok',
			organization: 'org',
			project: 'proj',
			sentryUrl: 'https://my-sentry.example.com',
		})
		await service.getIssues()

		const [url] = mockFetch.mock.calls[0] as [string, unknown]
		expect(url).toContain('https://my-sentry.example.com')
	})

	it('should infer https://us.sentry.io from US ingest DSN when sentryUrl omitted', async () => {
		const mockFetch = mock(async () => Response.json([]))
		globalThis.fetch = mockFetch as typeof globalThis.fetch

		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'tok',
			organization: 'org',
			project: 'proj',
			dsn: 'https://public@o1.ingest.us.sentry.io/1',
		})
		await service.getIssues()

		const [url] = mockFetch.mock.calls[0] as [string, unknown]
		expect(url).toContain('https://us.sentry.io')
	})

	it('should infer https://de.sentry.io from EU ingest DSN when sentryUrl omitted', async () => {
		const mockFetch = mock(async () => Response.json([]))
		globalThis.fetch = mockFetch as typeof globalThis.fetch

		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'tok',
			organization: 'org',
			project: 'proj',
			dsn: 'https://public@o1.ingest.de.sentry.io/1',
		})
		await service.getIssues()

		const [url] = mockFetch.mock.calls[0] as [string, unknown]
		expect(url).toContain('https://de.sentry.io')
	})

	it('should throw BadGatewayException when Sentry API returns 403', async () => {
		const mockFetch = mock(async () => new Response('', { status: 403 }))
		globalThis.fetch = mockFetch as typeof globalThis.fetch

		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'tok',
			organization: 'org',
			project: 'proj',
		})

		await expect(service.getIssues()).rejects.toBeInstanceOf(
			BadGatewayException,
		)
	})

	// =========================================================================
	// isOrgConfigured()
	// =========================================================================

	it('should report isOrgConfigured() true when authToken and organization are set', async () => {
		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'tok',
			organization: 'my-org',
			// no project
		})
		expect(service.isOrgConfigured()).toBe(true)
	})

	it('should report isOrgConfigured() false when authToken is missing', async () => {
		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({ organization: 'my-org' })
		expect(service.isOrgConfigured()).toBe(false)
	})

	it('should report isOrgConfigured() false when organization is missing', async () => {
		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({ authToken: 'tok' })
		expect(service.isOrgConfigured()).toBe(false)
	})

	// =========================================================================
	// getOrganizationProjects()
	// =========================================================================

	it('should fetch org projects and mark the active project', async () => {
		const mockProjects = [
			{
				id: '1',
				slug: 'my-project',
				name: 'My Project',
				platform: 'node',
				status: 'active',
				dateCreated: '2024-01-01',
			},
			{
				id: '2',
				slug: 'other-project',
				name: 'Other Project',
				platform: 'python',
				status: 'active',
				dateCreated: '2024-01-02',
			},
		]
		const mockFetch = mock(async () => Response.json(mockProjects))
		globalThis.fetch = mockFetch as typeof globalThis.fetch

		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'tok',
			organization: 'my-org',
			project: 'my-project',
		})
		const result = await service.getOrganizationProjects()

		expect(result).toHaveLength(2)
		expect(result[0]?.isActive).toBe(true)
		expect(result[1]?.isActive).toBe(false)
		const [url] = mockFetch.mock.calls[0] as [string, unknown]
		expect(url).toContain('/api/0/organizations/my-org/projects/')
	})

	it('should set errorCount from stats when provided by the API', async () => {
		const mockProjects = [
			{
				id: '1',
				slug: 'proj',
				name: 'Proj',
				platform: 'node',
				status: 'active',
				dateCreated: '2024-01-01',
				stats: [[1700000000, 42]],
			},
		]
		const mockFetch = mock(async () => Response.json(mockProjects))
		globalThis.fetch = mockFetch as typeof globalThis.fetch

		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'tok',
			organization: 'org',
			project: 'proj',
		})
		const result = await service.getOrganizationProjects()

		expect(result[0]?.errorCount).toBe(42)
	})

	it('should set errorCount to null when no stats in API response', async () => {
		const mockProjects = [
			{
				id: '1',
				slug: 'proj',
				name: 'Proj',
				platform: 'node',
				status: 'active',
				dateCreated: '2024-01-01',
			},
		]
		const mockFetch = mock(async () => Response.json(mockProjects))
		globalThis.fetch = mockFetch as typeof globalThis.fetch

		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'tok',
			organization: 'org',
			project: 'proj',
		})
		const result = await service.getOrganizationProjects()

		expect(result[0]?.errorCount).toBeNull()
	})

	it('should throw when org not configured and getOrganizationProjects() called', async () => {
		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({})
		await expect(service.getOrganizationProjects()).rejects.toThrow()
	})

	// =========================================================================
	// probeTokenScopes()
	// =========================================================================

	it('should return all scopes true when all probe endpoints return 200', async () => {
		const mockFetch = mock(async () => new Response('{}', { status: 200 }))
		globalThis.fetch = mockFetch as typeof globalThis.fetch

		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'tok',
			organization: 'org',
			project: 'proj',
		})
		const scopes = await service.probeTokenScopes()

		expect(scopes.orgRead).toBe(true)
		expect(scopes.projectRead).toBe(true)
		expect(scopes.eventRead).toBe(true)
		expect(scopes.alertsRead).toBe(true)
	})

	it('should return orgRead false when org endpoint returns 403', async () => {
		const mockFetch = mock(async (url: string) => {
			if ((url as string).endsWith('/api/0/organizations/org/')) {
				return new Response('', { status: 403 })
			}
			return new Response('{}', { status: 200 })
		})
		globalThis.fetch = mockFetch as typeof globalThis.fetch

		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'tok',
			organization: 'org',
			project: 'proj',
		})
		const scopes = await service.probeTokenScopes()

		expect(scopes.orgRead).toBe(false)
	})

	it('should return eventRead false without making request when project is not configured', async () => {
		const callCount = { count: 0 }
		const mockFetch = mock(async () => {
			callCount.count++
			return new Response('{}', { status: 200 })
		})
		globalThis.fetch = mockFetch as typeof globalThis.fetch

		const { SentryApiService } = await import('../services/sentry-api.service')
		// org configured but no project
		const service = new SentryApiService({
			authToken: 'tok',
			organization: 'org',
		})
		const scopes = await service.probeTokenScopes()

		expect(scopes.eventRead).toBe(false)
		// Only 3 requests made (org, projects, alerts) — not the event:read issues endpoint
		expect(callCount.count).toBe(3)
	})

	it('should treat unexpected status (500) as scope unavailable', async () => {
		const mockFetch = mock(async () => new Response('', { status: 500 }))
		globalThis.fetch = mockFetch as typeof globalThis.fetch

		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'tok',
			organization: 'org',
			project: 'proj',
		})
		const scopes = await service.probeTokenScopes()

		expect(scopes.orgRead).toBe(false)
		expect(scopes.projectRead).toBe(false)
		expect(scopes.eventRead).toBe(false)
		expect(scopes.alertsRead).toBe(false)
	})

	it('should cache scope probe results for 5 minutes', async () => {
		let fetchCount = 0
		const mockFetch = mock(async () => {
			fetchCount++
			return new Response('{}', { status: 200 })
		})
		globalThis.fetch = mockFetch as typeof globalThis.fetch

		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'tok',
			organization: 'org',
			project: 'proj',
		})
		await service.probeTokenScopes()
		const countAfterFirst = fetchCount
		await service.probeTokenScopes()

		// Second call should use cache — no additional fetch calls
		expect(fetchCount).toBe(countAfterFirst)
	})

	// =========================================================================
	// getProjectStats() / getIssues() — project override
	// =========================================================================

	it('should use provided projectSlug in getProjectStats() URL', async () => {
		const mockFetch = mock(async () => Response.json([]))
		globalThis.fetch = mockFetch as typeof globalThis.fetch

		const { SentryApiService } = await import('../services/sentry-api.service')
		// Service configured with 'default-project', but override with 'other-project'
		const service = new SentryApiService({
			authToken: 'tok',
			organization: 'my-org',
			project: 'default-project',
		})
		await service.getProjectStats('other-project')

		const [url] = mockFetch.mock.calls[0] as [string, unknown]
		expect(url).toContain('/api/0/projects/my-org/other-project/')
	})

	it('should use provided projectSlug in getIssues() URL', async () => {
		const mockFetch = mock(async () => Response.json([]))
		globalThis.fetch = mockFetch as typeof globalThis.fetch

		const { SentryApiService } = await import('../services/sentry-api.service')
		const service = new SentryApiService({
			authToken: 'tok',
			organization: 'my-org',
			project: 'default-project',
		})
		await service.getIssues('is:unresolved', 'other-project')

		const [url] = mockFetch.mock.calls[0] as [string, unknown]
		expect(url).toContain('/api/0/projects/my-org/other-project/issues/')
	})

	it('should allow getProjectStats() with no configured project when slug is provided', async () => {
		const mockFetch = mock(async () => Response.json([]))
		globalThis.fetch = mockFetch as typeof globalThis.fetch

		const { SentryApiService } = await import('../services/sentry-api.service')
		// Only org-level config (no project)
		const service = new SentryApiService({
			authToken: 'tok',
			organization: 'my-org',
		})
		await service.getProjectStats('override-project')

		const [url] = mockFetch.mock.calls[0] as [string, unknown]
		expect(url).toContain('/api/0/projects/my-org/override-project/')
	})
})
