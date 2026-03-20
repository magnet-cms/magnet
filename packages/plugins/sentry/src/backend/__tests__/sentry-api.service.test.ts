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
})
