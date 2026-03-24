import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	mockSendMail: vi.fn(() =>
		Promise.resolve({
			messageId: 'msg-001',
			accepted: ['user@example.com'],
			rejected: [],
		}),
	),
	mockVerify: vi.fn(() => Promise.resolve(true)),
	mockClose: vi.fn(() => {}),
}))

vi.mock('nodemailer', () => ({
	createTransport: () => ({
		sendMail: mocks.mockSendMail,
		verify: mocks.mockVerify,
		close: mocks.mockClose,
	}),
}))

import { NodemailerEmailAdapter } from '../nodemailer.adapter'

const config = {
	host: 'smtp.example.com',
	port: 587,
	secure: false,
	auth: { user: 'user@test.com', pass: 'secret' },
}

describe('NodemailerEmailAdapter', () => {
	beforeEach(() => {
		mocks.mockSendMail.mockClear()
		mocks.mockVerify.mockClear()
		mocks.mockClose.mockClear()
	})

	it('should have name "nodemailer"', () => {
		const adapter = new NodemailerEmailAdapter(config)
		expect(adapter.name).toBe('nodemailer')
	})

	it('should send email successfully', async () => {
		const adapter = new NodemailerEmailAdapter(config)
		const result = await adapter.send({
			to: 'user@example.com',
			from: 'sender@example.com',
			subject: 'Test',
			html: '<p>Hello</p>',
		})

		expect(result.accepted).toBe(true)
		expect(result.id).toBe('msg-001')
		expect(result.acceptedAddresses).toEqual(['user@example.com'])
		expect(mocks.mockSendMail).toHaveBeenCalledTimes(1)
	})

	it('should handle send failure gracefully', async () => {
		mocks.mockSendMail.mockImplementationOnce(() =>
			Promise.reject(new Error('Connection refused')),
		)
		const adapter = new NodemailerEmailAdapter(config)
		const result = await adapter.send({
			to: 'user@example.com',
			subject: 'Test',
			html: '<p>Hello</p>',
		})

		expect(result.accepted).toBe(false)
		expect(result.error).toBe('Connection refused')
	})

	it('should include attachments in mail options', async () => {
		const adapter = new NodemailerEmailAdapter(config)
		await adapter.send({
			to: 'user@example.com',
			subject: 'Test',
			html: '<p>Hello</p>',
			attachments: [
				{
					filename: 'file.txt',
					content: 'Hello',
					contentType: 'text/plain',
				},
			],
		})

		expect(mocks.mockSendMail).toHaveBeenCalledTimes(1)
		const callArgs = mocks.mockSendMail.mock.calls[0]?.[0] as Record<
			string,
			unknown
		>
		expect(callArgs.attachments).toBeDefined()
	})

	it('should verify connection successfully', async () => {
		const adapter = new NodemailerEmailAdapter(config)
		const result = await adapter.verify()
		expect(result).toBe(true)
		expect(mocks.mockVerify).toHaveBeenCalledTimes(1)
	})

	it('should handle verify failure', async () => {
		mocks.mockVerify.mockImplementationOnce(() =>
			Promise.reject(new Error('Auth failed')),
		)
		const adapter = new NodemailerEmailAdapter(config)
		const result = await adapter.verify()
		expect(result).toBe(false)
	})

	it('should dispose and close transporter', async () => {
		const adapter = new NodemailerEmailAdapter(config)
		// Trigger transporter creation
		await adapter.send({ to: 'a@b.com', subject: 'x', html: 'y' })
		await adapter.dispose()
		expect(mocks.mockClose).toHaveBeenCalledTimes(1)
	})

	it('should not throw if dispose called before any send', async () => {
		const adapter = new NodemailerEmailAdapter(config)
		// dispose before any send — transporter is null, should be a no-op
		await adapter.dispose()
		expect(mocks.mockClose).not.toHaveBeenCalled()
	})

	it('should send batch by delegating each email', async () => {
		const adapter = new NodemailerEmailAdapter(config)
		const results = await adapter.sendBatch([
			{ to: 'a@example.com', subject: 'A', html: 'a' },
			{ to: 'b@example.com', subject: 'B', html: 'b' },
		])

		expect(results).toHaveLength(2)
		expect(results[0]?.accepted).toBe(true)
		expect(results[1]?.accepted).toBe(true)
		expect(mocks.mockSendMail).toHaveBeenCalledTimes(2)
	})
})
