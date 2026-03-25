import 'reflect-metadata'
import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@magnet-cms/common', () => ({
	InjectModel: () => () => {},
	Model: class {},
	Schema: () => () => {},
	Field: new Proxy({}, { get: () => () => () => {} }),
	Prop: () => () => {},
	Settings: () => () => {},
	SettingField: new Proxy({}, { get: () => () => () => {} }),
}))

import { WebhookService } from '../webhook.service'

// ─── Mock Models ──────────────────────────────────────────────────────────────

const mockWebhookModel = {
	find: vi.fn(),
	findOne: vi.fn(),
	findMany: vi.fn(),
	findById: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
}

const mockDeliveryModel = {
	find: vi.fn(),
	findOne: vi.fn(),
	findMany: vi.fn(),
	findById: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
}

const mockSettingsService = {
	get: vi.fn(),
}

const mockLogger = {
	setContext: vi.fn(),
	log: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
}

// ─── Sample webhook ───────────────────────────────────────────────────────────

const sampleWebhook = {
	id: 'wh-1',
	name: 'Test Webhook',
	url: 'https://example.com/webhook',
	events: ['content.created'],
	enabled: true,
	secret: 'mysecretvalue1234',
	createdAt: new Date(),
	updatedAt: new Date(),
}

const webhookSettings = { maxRetries: 3, timeoutMs: 5000 }

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WebhookService', () => {
	let service: WebhookService

	beforeEach(() => {
		vi.clearAllMocks()
		mockSettingsService.get.mockResolvedValue(webhookSettings)
		mockDeliveryModel.create.mockResolvedValue({})

		service = new WebhookService(
			mockWebhookModel as never,
			mockDeliveryModel as never,
			mockSettingsService as never,
			mockLogger as never,
		)
	})

	// ─── sign ───────────────────────────────────────────────────────────────

	describe('sign', () => {
		it('should produce a sha256 HMAC signature', () => {
			const payload = '{"event":"test"}'
			const secret = 'mysecret'
			const expected = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`

			expect(service.sign(payload, secret)).toBe(expected)
		})

		it('should produce different signatures for different payloads', () => {
			const sig1 = service.sign('payload1', 'secret')
			const sig2 = service.sign('payload2', 'secret')
			expect(sig1).not.toBe(sig2)
		})

		it('should produce different signatures for different secrets', () => {
			const sig1 = service.sign('payload', 'secret1')
			const sig2 = service.sign('payload', 'secret2')
			expect(sig1).not.toBe(sig2)
		})
	})

	// ─── create ─────────────────────────────────────────────────────────────

	describe('create', () => {
		it('should create a webhook with a generated secret', async () => {
			mockWebhookModel.create.mockImplementation((data) =>
				Promise.resolve({ ...data, id: 'wh-new' }),
			)

			const result = await service.create({
				name: 'My Hook',
				url: 'https://example.com',
				events: ['content.created'],
			})

			expect(mockWebhookModel.create).toHaveBeenCalledOnce()
			expect(result.secret).toBeDefined()
			expect(result.secret.length).toBeGreaterThan(0)
		})

		it('should use provided secret instead of generating one', async () => {
			mockWebhookModel.create.mockImplementation((data) =>
				Promise.resolve({ ...data, id: 'wh-2' }),
			)

			const result = await service.create({
				name: 'My Hook',
				url: 'https://example.com',
				events: ['content.created'],
				secret: 'custom-secret',
			})

			expect(result.secret).toBe('custom-secret')
		})

		it('should default enabled to true', async () => {
			mockWebhookModel.create.mockImplementation((data) =>
				Promise.resolve({ ...data, id: 'wh-3' }),
			)

			await service.create({
				name: 'My Hook',
				url: 'https://example.com',
				events: [],
			})

			expect(mockWebhookModel.create).toHaveBeenCalledWith(
				expect.objectContaining({ enabled: true }),
			)
		})
	})

	// ─── findAll (with secret masking) ───────────────────────────────────────

	describe('findAll', () => {
		it('should return webhooks with masked secrets', async () => {
			mockWebhookModel.find.mockResolvedValue([sampleWebhook])

			const result = await service.findAll()

			expect(result[0].secret).toBe('***...1234')
		})

		it('should return empty array when no webhooks', async () => {
			mockWebhookModel.find.mockResolvedValue([])
			expect(await service.findAll()).toEqual([])
		})
	})

	// ─── findById (with secret masking) ──────────────────────────────────────

	describe('findById', () => {
		it('should return webhook with masked secret', async () => {
			mockWebhookModel.findById.mockResolvedValue(sampleWebhook)

			const result = await service.findById('wh-1')
			expect(result?.secret).toBe('***...1234')
		})

		it('should return null if not found', async () => {
			mockWebhookModel.findById.mockResolvedValue(null)
			expect(await service.findById('nonexistent')).toBeNull()
		})
	})

	// ─── update ──────────────────────────────────────────────────────────────

	describe('update', () => {
		it('should update webhook and return masked secret', async () => {
			const updated = { ...sampleWebhook, name: 'Updated' }
			mockWebhookModel.update.mockResolvedValue(updated)

			const result = await service.update('wh-1', { name: 'Updated' })
			expect(result.name).toBe('Updated')
			expect(result.secret).toBe('***...1234')
		})
	})

	// ─── delete ──────────────────────────────────────────────────────────────

	describe('delete', () => {
		it('should delete webhook and return true', async () => {
			mockWebhookModel.delete.mockResolvedValue(true)

			const result = await service.delete('wh-1')
			expect(result).toBe(true)
			expect(mockWebhookModel.delete).toHaveBeenCalledWith({ id: 'wh-1' })
		})
	})

	// ─── regenerateSecret ────────────────────────────────────────────────────

	describe('regenerateSecret', () => {
		it('should return a new secret', async () => {
			mockWebhookModel.findById.mockResolvedValue(sampleWebhook)
			mockWebhookModel.update.mockResolvedValue({})

			const result = await service.regenerateSecret('wh-1')
			expect(result).not.toBeNull()
			expect(result?.secret).toBeDefined()
			expect(result?.secret).not.toBe(sampleWebhook.secret)
		})

		it('should return null if webhook not found', async () => {
			mockWebhookModel.findById.mockResolvedValue(null)
			expect(await service.regenerateSecret('nonexistent')).toBeNull()
		})
	})

	// ─── deliver ─────────────────────────────────────────────────────────────

	describe('deliver', () => {
		it('should return success on 2xx response', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					status: 200,
					text: async () => 'OK',
				}),
			)

			const result = await service.deliver(sampleWebhook, 'content.created', {
				id: '1',
			})
			expect(result.success).toBe(true)
			expect(result.statusCode).toBe(200)
		})

		it('should return failure on 4xx response', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					status: 400,
					text: async () => 'Bad Request',
				}),
			)

			const result = await service.deliver(sampleWebhook, 'content.created', {
				id: '1',
			})
			expect(result.success).toBe(false)
			expect(result.error).toContain('400')
		})

		it('should return failure when fetch throws', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockRejectedValue(new Error('Network error')),
			)

			const result = await service.deliver(sampleWebhook, 'content.created', {
				id: '1',
			})
			expect(result.success).toBe(false)
			expect(result.error).toContain('Network error')
		})

		it('should include correct signature header', async () => {
			let capturedHeaders: Record<string, string> = {}
			vi.stubGlobal(
				'fetch',
				vi.fn().mockImplementation((_url, opts) => {
					capturedHeaders = opts.headers
					return Promise.resolve({ status: 200, text: async () => '' })
				}),
			)

			const payload = { id: '1' }
			await service.deliver(sampleWebhook, 'content.created', payload)

			const expectedSig = service.sign(
				JSON.stringify(payload),
				sampleWebhook.secret,
			)
			expect(capturedHeaders['X-Magnet-Signature']).toBe(expectedSig)
		})

		afterEach(() => {
			vi.unstubAllGlobals()
		})
	})

	// ─── deliverWithRetry ────────────────────────────────────────────────────

	describe('deliverWithRetry', () => {
		beforeEach(() => {
			vi.useFakeTimers()
		})

		afterEach(() => {
			vi.useRealTimers()
			vi.unstubAllGlobals()
		})

		it('should succeed on first attempt and not retry', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({ status: 200, text: async () => 'OK' }),
			)

			const resultPromise = service.deliverWithRetry(
				sampleWebhook,
				'content.created',
				{ id: '1' },
			)
			await vi.runAllTimersAsync()
			const result = await resultPromise

			expect(result.success).toBe(true)
			expect(result.retryCount).toBe(0)
		})

		it('should retry on failure and stop when successful', async () => {
			const mockFetch = vi
				.fn()
				.mockResolvedValueOnce({ status: 500, text: async () => 'Error' })
				.mockResolvedValueOnce({ status: 200, text: async () => 'OK' })
			vi.stubGlobal('fetch', mockFetch)
			mockSettingsService.get.mockResolvedValue({
				maxRetries: 3,
				timeoutMs: 5000,
			})

			const resultPromise = service.deliverWithRetry(
				sampleWebhook,
				'content.created',
				{ id: '1' },
			)
			await vi.runAllTimersAsync()
			const result = await resultPromise

			expect(result.success).toBe(true)
			expect(mockFetch).toHaveBeenCalledTimes(2)
		})

		it('should log each delivery attempt', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({ status: 500, text: async () => 'Error' }),
			)
			mockSettingsService.get.mockResolvedValue({
				maxRetries: 1,
				timeoutMs: 5000,
			})

			const resultPromise = service.deliverWithRetry(
				sampleWebhook,
				'content.created',
				{ id: '1' },
			)
			await vi.runAllTimersAsync()
			await resultPromise

			// 1 initial + 1 retry = 2 delivery log entries
			expect(mockDeliveryModel.create).toHaveBeenCalledTimes(2)
		})
	})

	// ─── getDeliveries ────────────────────────────────────────────────────────

	describe('getDeliveries', () => {
		const makeDeliveries = (count: number) =>
			Array.from({ length: count }, (_, i) => ({
				id: `d-${i}`,
				webhookId: 'wh-1',
				createdAt: new Date(Date.now() - i * 1000),
			}))

		it('should return paginated results', async () => {
			mockDeliveryModel.findMany.mockResolvedValue(makeDeliveries(25))

			const result = await service.getDeliveries('wh-1', 1, 10)
			expect(result.items).toHaveLength(10)
			expect(result.total).toBe(25)
			expect(result.totalPages).toBe(3)
		})

		it('should return second page', async () => {
			mockDeliveryModel.findMany.mockResolvedValue(makeDeliveries(25))

			const result = await service.getDeliveries('wh-1', 2, 10)
			expect(result.items).toHaveLength(10)
			expect(result.page).toBe(2)
		})

		it('should return empty when no deliveries', async () => {
			mockDeliveryModel.findMany.mockResolvedValue([])

			const result = await service.getDeliveries('wh-1')
			expect(result.items).toHaveLength(0)
			expect(result.total).toBe(0)
			expect(result.totalPages).toBe(0)
		})
	})
})
