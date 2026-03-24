import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	mockSend: vi.fn(() =>
		Promise.resolve({ data: { id: 'resend-001' }, error: null }),
	),
	mockBatchSend: vi.fn(() =>
		Promise.resolve({
			data: { data: [{ id: 'resend-batch-1' }, { id: 'resend-batch-2' }] },
			error: null,
		}),
	),
	mockDomainsList: vi.fn(() => Promise.resolve({ error: null })),
}))

vi.mock('resend', () => ({
	Resend: class {
		emails = { send: mocks.mockSend }
		batch = { send: mocks.mockBatchSend }
		domains = { list: mocks.mockDomainsList }
	},
}))

import { ResendEmailAdapter } from '../resend.adapter'

describe('ResendEmailAdapter', () => {
	beforeEach(() => {
		mocks.mockSend.mockClear()
		mocks.mockBatchSend.mockClear()
		mocks.mockDomainsList.mockClear()
	})

	it('should have name "resend"', () => {
		const adapter = new ResendEmailAdapter({ apiKey: 're_test_key' })
		expect(adapter.name).toBe('resend')
	})

	it('should send email successfully', async () => {
		const adapter = new ResendEmailAdapter({ apiKey: 're_test_key' })
		const result = await adapter.send({
			to: 'user@example.com',
			from: 'sender@example.com',
			subject: 'Test',
			html: '<p>Hello</p>',
		})

		expect(result.accepted).toBe(true)
		expect(result.id).toBe('resend-001')
		expect(mocks.mockSend).toHaveBeenCalledTimes(1)
	})

	it('should handle API error response', async () => {
		mocks.mockSend.mockImplementationOnce(() =>
			Promise.resolve({
				data: null,
				error: { message: 'Invalid API key', name: 'validation_error' },
			}),
		)
		const adapter = new ResendEmailAdapter({ apiKey: 're_bad_key' })
		const result = await adapter.send({
			to: 'user@example.com',
			from: 'sender@example.com',
			subject: 'Test',
			html: '<p>Hello</p>',
		})

		expect(result.accepted).toBe(false)
		expect(result.error).toBe('Invalid API key')
	})

	it('should handle thrown exception', async () => {
		mocks.mockSend.mockImplementationOnce(() =>
			Promise.reject(new Error('Network error')),
		)
		const adapter = new ResendEmailAdapter({ apiKey: 're_test_key' })
		const result = await adapter.send({
			to: 'user@example.com',
			from: 'sender@example.com',
			subject: 'Test',
			html: '<p>Hello</p>',
		})

		expect(result.accepted).toBe(false)
		expect(result.error).toBe('Network error')
	})

	it('should sendBatch successfully', async () => {
		const adapter = new ResendEmailAdapter({ apiKey: 're_test_key' })
		const results = await adapter.sendBatch([
			{ to: 'a@example.com', from: 'x@y.com', subject: 'A', html: 'a' },
			{ to: 'b@example.com', from: 'x@y.com', subject: 'B', html: 'b' },
		])

		expect(results).toHaveLength(2)
		expect(results[0]?.accepted).toBe(true)
		expect(results[0]?.id).toBe('resend-batch-1')
		expect(results[1]?.id).toBe('resend-batch-2')
		expect(mocks.mockBatchSend).toHaveBeenCalledTimes(1)
	})

	it('should handle sendBatch API error', async () => {
		mocks.mockBatchSend.mockImplementationOnce(() =>
			Promise.resolve({
				data: null,
				error: { message: 'Rate limit exceeded', name: 'rate_limit_error' },
			}),
		)
		const adapter = new ResendEmailAdapter({ apiKey: 're_test_key' })
		const results = await adapter.sendBatch([
			{ to: 'a@example.com', from: 'x@y.com', subject: 'A', html: 'a' },
		])

		expect(results).toHaveLength(1)
		expect(results[0]?.accepted).toBe(false)
		expect(results[0]?.error).toBe('Rate limit exceeded')
	})

	it('should verify via domains.list', async () => {
		const adapter = new ResendEmailAdapter({ apiKey: 're_test_key' })
		const result = await adapter.verify()
		expect(result).toBe(true)
		expect(mocks.mockDomainsList).toHaveBeenCalledTimes(1)
	})

	it('should return false for verify when domains.list returns a non-restricted error', async () => {
		mocks.mockDomainsList.mockImplementationOnce(() =>
			Promise.resolve({
				error: { message: 'Unauthorized', name: 'auth_error' },
			}),
		)
		const adapter = new ResendEmailAdapter({ apiKey: 're_bad_key' })
		const result = await adapter.verify()
		expect(result).toBe(false)
	})

	it('should return true for verify when API key is sending-only (restricted_api_key)', async () => {
		mocks.mockDomainsList.mockImplementationOnce(() =>
			Promise.resolve({
				data: null,
				error: {
					statusCode: 401,
					message: 'This API key is restricted to only send emails',
					name: 'restricted_api_key',
				},
			}),
		)
		const adapter = new ResendEmailAdapter({ apiKey: 're_sending_only_key' })
		const result = await adapter.verify()
		expect(result).toBe(true)
	})

	it('should return false for verify when API key is invalid (validation_error)', async () => {
		mocks.mockDomainsList.mockImplementationOnce(() =>
			Promise.resolve({
				data: null,
				error: {
					statusCode: 400,
					message: 'API key is invalid',
					name: 'validation_error',
				},
			}),
		)
		const adapter = new ResendEmailAdapter({ apiKey: 're_invalid' })
		const result = await adapter.verify()
		expect(result).toBe(false)
	})
})
