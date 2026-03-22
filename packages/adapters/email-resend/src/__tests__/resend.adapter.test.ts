import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { ResendEmailAdapter } from '../resend.adapter'

// Mock Resend SDK
const mockSend = mock(() =>
	Promise.resolve({ data: { id: 'resend-001' }, error: null }),
)
const mockBatchSend = mock(() =>
	Promise.resolve({
		data: { data: [{ id: 'resend-batch-1' }, { id: 'resend-batch-2' }] },
		error: null,
	}),
)
const mockDomainsList = mock(() => Promise.resolve({ error: null }))

mock.module('resend', () => ({
	Resend: class {
		emails = { send: mockSend }
		batch = { send: mockBatchSend }
		domains = { list: mockDomainsList }
	},
}))

describe('ResendEmailAdapter', () => {
	beforeEach(() => {
		mockSend.mockClear()
		mockBatchSend.mockClear()
		mockDomainsList.mockClear()
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
		expect(mockSend).toHaveBeenCalledTimes(1)
	})

	it('should handle API error response', async () => {
		mockSend.mockImplementationOnce(() =>
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
		mockSend.mockImplementationOnce(() =>
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
		expect(mockBatchSend).toHaveBeenCalledTimes(1)
	})

	it('should handle sendBatch API error', async () => {
		mockBatchSend.mockImplementationOnce(() =>
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
		expect(mockDomainsList).toHaveBeenCalledTimes(1)
	})

	it('should return false for verify when domains.list returns a non-restricted error', async () => {
		mockDomainsList.mockImplementationOnce(() =>
			Promise.resolve({
				error: { message: 'Unauthorized', name: 'auth_error' },
			}),
		)
		const adapter = new ResendEmailAdapter({ apiKey: 're_bad_key' })
		const result = await adapter.verify()
		expect(result).toBe(false)
	})

	it('should return true for verify when API key is sending-only (restricted_api_key)', async () => {
		mockDomainsList.mockImplementationOnce(() =>
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
		mockDomainsList.mockImplementationOnce(() =>
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
