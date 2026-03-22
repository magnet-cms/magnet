import { describe, expect, it, mock } from 'bun:test'
import { createHttpAdapter } from '../http-adapter'

// Minimal in-memory token storage
const memStorage = {
	_tokens: {} as Record<string, string>,
	getAccessToken: () => memStorage._tokens.access ?? null,
	setAccessToken: (t: string) => {
		memStorage._tokens.access = t
	},
	getRefreshToken: () => memStorage._tokens.refresh ?? null,
	setRefreshToken: (t: string) => {
		memStorage._tokens.refresh = t
	},
	getTokenExpiry: () => null,
	setTokenExpiry: (_: number) => {},
	clearAll: () => {
		memStorage._tokens = {}
	},
}

function makeAdapter(fetchImpl: typeof fetch) {
	// Inject fetch via global override for this test
	const originalFetch = globalThis.fetch
	globalThis.fetch = fetchImpl
	const adapter = createHttpAdapter({
		baseUrl: 'http://api.test',
		tokenStorage: memStorage,
	})
	globalThis.fetch = originalFetch
	return adapter
}

describe('createHttpAdapter error handling', () => {
	it('should use backend error message from JSON body when request fails', async () => {
		const mockFetch = mock(() =>
			Promise.resolve(
				new Response(
					JSON.stringify({
						statusCode: 400,
						message: 'Password must be at least 8 characters',
						error: 'Bad Request',
					}),
					{
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					},
				),
			),
		)

		const adapter = createHttpAdapter({
			baseUrl: 'http://api.test',
			tokenStorage: memStorage,
		})

		// Temporarily replace globalThis.fetch
		const orig = globalThis.fetch
		globalThis.fetch = mockFetch as unknown as typeof fetch

		try {
			await adapter.auth.login({ email: 'a@b.com', password: 'weak' })
			expect(true).toBe(false) // should not reach here
		} catch (err) {
			expect(err).toBeInstanceOf(Error)
			expect((err as Error).message).toBe(
				'Password must be at least 8 characters',
			)
		} finally {
			globalThis.fetch = orig
		}
	})

	it('should fall back to status text when error body is not JSON', async () => {
		const mockFetch = mock(() =>
			Promise.resolve(
				new Response('Internal Server Error', {
					status: 500,
					statusText: 'Internal Server Error',
					headers: { 'Content-Type': 'text/plain' },
				}),
			),
		)

		const adapter = createHttpAdapter({
			baseUrl: 'http://api.test',
			tokenStorage: memStorage,
		})

		const orig = globalThis.fetch
		globalThis.fetch = mockFetch as unknown as typeof fetch

		try {
			await adapter.auth.login({ email: 'a@b.com', password: 'pass' })
			expect(true).toBe(false)
		} catch (err) {
			expect(err).toBeInstanceOf(Error)
			// Falls back to generic message — should NOT be the NestJS message
			expect((err as Error).message).toContain('500')
		} finally {
			globalThis.fetch = orig
		}
	})

	it('should handle array message fields from NestJS validation errors', async () => {
		const mockFetch = mock(() =>
			Promise.resolve(
				new Response(
					JSON.stringify({
						statusCode: 400,
						message: ['email must be an email', 'password is too short'],
						error: 'Bad Request',
					}),
					{
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					},
				),
			),
		)

		const adapter = createHttpAdapter({
			baseUrl: 'http://api.test',
			tokenStorage: memStorage,
		})

		const orig = globalThis.fetch
		globalThis.fetch = mockFetch as unknown as typeof fetch

		try {
			await adapter.auth.login({ email: 'bad', password: 'x' })
			expect(true).toBe(false)
		} catch (err) {
			expect(err).toBeInstanceOf(Error)
			expect((err as Error).message).toBe(
				'email must be an email, password is too short',
			)
		} finally {
			globalThis.fetch = orig
		}
	})
})
