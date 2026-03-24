import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMagnetClient } from '../client'

// Mock openapi-fetch so tests run without a real server
vi.mock('openapi-fetch', () => ({
	default: vi.fn(),
}))

import createFetchClient from 'openapi-fetch'

const mockCreateFetchClient = createFetchClient as unknown as ReturnType<
	typeof vi.fn
>

let mockGet: ReturnType<typeof vi.fn>
let mockPost: ReturnType<typeof vi.fn>
let mockPut: ReturnType<typeof vi.fn>
let mockDelete: ReturnType<typeof vi.fn>

beforeEach(() => {
	mockGet = vi.fn().mockResolvedValue({ data: {}, error: undefined })
	mockPost = vi.fn().mockResolvedValue({ data: {}, error: undefined })
	mockPut = vi.fn().mockResolvedValue({ data: {}, error: undefined })
	mockDelete = vi.fn().mockResolvedValue({ data: undefined, error: undefined })

	mockCreateFetchClient.mockReturnValue({
		GET: mockGet,
		POST: mockPost,
		PUT: mockPut,
		DELETE: mockDelete,
	})
})

describe('createMagnetClient', () => {
	it('should return content, auth, storage, and raw namespaces', () => {
		const client = createMagnetClient({ baseUrl: 'http://localhost:3000' })
		expect(client).toHaveProperty('content')
		expect(client).toHaveProperty('auth')
		expect(client).toHaveProperty('storage')
		expect(client).toHaveProperty('raw')
	})

	it('should pass baseUrl to openapi-fetch createClient', () => {
		createMagnetClient({ baseUrl: 'http://localhost:3000' })
		expect(mockCreateFetchClient).toHaveBeenCalledWith(
			expect.objectContaining({ baseUrl: 'http://localhost:3000' }),
		)
	})

	it('should pass Bearer token as Authorization header', () => {
		createMagnetClient({ baseUrl: 'http://localhost:3000', token: 'my-jwt' })
		expect(mockCreateFetchClient).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: 'Bearer my-jwt' }),
			}),
		)
	})

	it('should pass API key as x-api-key header', () => {
		createMagnetClient({ baseUrl: 'http://localhost:3000', apiKey: 'my-key' })
		expect(mockCreateFetchClient).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({ 'x-api-key': 'my-key' }),
			}),
		)
	})

	it('should merge custom headers', () => {
		createMagnetClient({
			baseUrl: 'http://localhost:3000',
			headers: { 'x-tenant': 'acme' },
		})
		expect(mockCreateFetchClient).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({ 'x-tenant': 'acme' }),
			}),
		)
	})
})

describe('client.content', () => {
	it('list() calls GET /content/{schema}', async () => {
		const client = createMagnetClient({ baseUrl: 'http://localhost:3000' })
		await client.content.list('articles')
		expect(mockGet).toHaveBeenCalledWith(
			'/content/{schema}',
			expect.objectContaining({
				params: expect.objectContaining({ path: { schema: 'articles' } }),
			}),
		)
	})

	it('get() calls GET /content/{schema}/{documentId}', async () => {
		const client = createMagnetClient({ baseUrl: 'http://localhost:3000' })
		await client.content.get('articles', 'doc-1')
		expect(mockGet).toHaveBeenCalledWith(
			'/content/{schema}/{documentId}',
			expect.objectContaining({
				params: expect.objectContaining({
					path: { schema: 'articles', documentId: 'doc-1' },
				}),
			}),
		)
	})

	it('create() calls POST /content/{schema}', async () => {
		const client = createMagnetClient({ baseUrl: 'http://localhost:3000' })
		await client.content.create('articles', { title: 'Hello' })
		expect(mockPost).toHaveBeenCalledWith(
			'/content/{schema}',
			expect.objectContaining({
				params: expect.objectContaining({ path: { schema: 'articles' } }),
				body: { title: 'Hello' },
			}),
		)
	})

	it('update() calls PUT /content/{schema}/{documentId}', async () => {
		const client = createMagnetClient({ baseUrl: 'http://localhost:3000' })
		await client.content.update('articles', 'doc-1', { title: 'Updated' })
		expect(mockPut).toHaveBeenCalledWith(
			'/content/{schema}/{documentId}',
			expect.objectContaining({
				params: expect.objectContaining({
					path: { schema: 'articles', documentId: 'doc-1' },
				}),
				body: { title: 'Updated' },
			}),
		)
	})

	it('delete() calls DELETE /content/{schema}/{documentId}', async () => {
		const client = createMagnetClient({ baseUrl: 'http://localhost:3000' })
		await client.content.delete('articles', 'doc-1')
		expect(mockDelete).toHaveBeenCalledWith(
			'/content/{schema}/{documentId}',
			expect.objectContaining({
				params: expect.objectContaining({
					path: { schema: 'articles', documentId: 'doc-1' },
				}),
			}),
		)
	})

	it('publish() calls POST /content/{schema}/{documentId}/publish', async () => {
		const client = createMagnetClient({ baseUrl: 'http://localhost:3000' })
		await client.content.publish('articles', 'doc-1')
		expect(mockPost).toHaveBeenCalledWith(
			'/content/{schema}/{documentId}/publish',
			expect.objectContaining({
				params: expect.objectContaining({
					path: { schema: 'articles', documentId: 'doc-1' },
				}),
			}),
		)
	})

	it('unpublish() calls POST /content/{schema}/{documentId}/unpublish', async () => {
		const client = createMagnetClient({ baseUrl: 'http://localhost:3000' })
		await client.content.unpublish('articles', 'doc-1')
		expect(mockPost).toHaveBeenCalledWith(
			'/content/{schema}/{documentId}/unpublish',
			expect.objectContaining({
				params: expect.objectContaining({
					path: { schema: 'articles', documentId: 'doc-1' },
				}),
			}),
		)
	})
})

describe('client.storage', () => {
	it('list() calls GET /storage/media', async () => {
		const client = createMagnetClient({ baseUrl: 'http://localhost:3000' })
		await client.storage.list()
		expect(mockGet).toHaveBeenCalledWith('/storage/media', expect.anything())
	})

	it('delete() calls DELETE /storage/media/{id}', async () => {
		const client = createMagnetClient({ baseUrl: 'http://localhost:3000' })
		await client.storage.delete('media-id-1')
		expect(mockDelete).toHaveBeenCalledWith(
			'/storage/media/{id}',
			expect.objectContaining({
				params: expect.objectContaining({ path: { id: 'media-id-1' } }),
			}),
		)
	})
})

describe('client.auth', () => {
	it('login() calls POST /auth/login', async () => {
		const client = createMagnetClient({ baseUrl: 'http://localhost:3000' })
		await client.auth.login('user@example.com', 'secret')
		expect(mockPost).toHaveBeenCalledWith(
			'/auth/login',
			expect.objectContaining({
				body: { email: 'user@example.com', password: 'secret' },
			}),
		)
	})

	it('me() calls GET /auth/me', async () => {
		const client = createMagnetClient({ baseUrl: 'http://localhost:3000' })
		await client.auth.me()
		expect(mockGet).toHaveBeenCalledWith('/auth/me', expect.anything())
	})

	it('register() calls POST /auth/register', async () => {
		const client = createMagnetClient({ baseUrl: 'http://localhost:3000' })
		await client.auth.register({
			email: 'u@example.com',
			password: 'pass',
			name: 'U',
		})
		expect(mockPost).toHaveBeenCalledWith(
			'/auth/register',
			expect.objectContaining({
				body: expect.objectContaining({ email: 'u@example.com' }),
			}),
		)
	})
})
