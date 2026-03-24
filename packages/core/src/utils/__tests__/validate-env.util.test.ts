import type {
	DatabaseMagnetProvider,
	MagnetProvider,
	PluginMagnetProvider,
} from '@magnet-cms/common'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { validateEnvironment } from '../validate-env.util'

describe('validateEnvironment', () => {
	const originalEnv = { ...process.env }

	beforeEach(() => {
		// Clean env for each test
		for (const key of Object.keys(process.env)) {
			if (
				key.startsWith('TEST_') ||
				key === 'DATABASE_URL' ||
				key === 'STRIPE_SECRET_KEY' ||
				key === 'STRIPE_WEBHOOK_SECRET' ||
				key === 'JWT_SECRET'
			) {
				delete process.env[key]
			}
		}
	})

	afterEach(() => {
		// Restore original env
		for (const key of Object.keys(process.env)) {
			if (!(key in originalEnv)) {
				delete process.env[key]
			}
		}
	})

	it('should not throw when all required env vars are present', () => {
		process.env.DATABASE_URL = 'postgres://localhost/test'
		process.env.JWT_SECRET = 'test-secret'

		const providers: MagnetProvider[] = [
			{
				type: 'database',
				adapter: {} as DatabaseMagnetProvider['adapter'],
				config: { connectionString: '', dialect: 'postgresql' },
				envVars: [
					{
						name: 'DATABASE_URL',
						required: true,
						description: 'Database URL',
					},
				],
			},
		]

		expect(() =>
			validateEnvironment(providers, undefined, { exitOnFailure: false }),
		).not.toThrow()
	})

	it('should throw when required env vars are missing', () => {
		const providers: MagnetProvider[] = [
			{
				type: 'database',
				adapter: {} as DatabaseMagnetProvider['adapter'],
				config: { connectionString: '', dialect: 'postgresql' },
				envVars: [
					{
						name: 'DATABASE_URL',
						required: true,
						description: 'Database connection string',
					},
				],
			},
		]

		expect(() =>
			validateEnvironment(providers, undefined, { exitOnFailure: false }),
		).toThrow('Missing required environment variables')
	})

	it('should include all missing vars grouped by provider type in error message', () => {
		const providers: MagnetProvider[] = [
			{
				type: 'database',
				adapter: {} as DatabaseMagnetProvider['adapter'],
				config: { connectionString: '', dialect: 'postgresql' },
				envVars: [
					{
						name: 'DATABASE_URL',
						required: true,
						description: 'Database connection string',
					},
				],
			},
			{
				type: 'plugin',
				plugin: class TestPlugin {},
				options: {},
				envVars: [
					{
						name: 'STRIPE_SECRET_KEY',
						required: true,
						description: 'Stripe API secret key',
					},
					{
						name: 'STRIPE_WEBHOOK_SECRET',
						required: true,
						description: 'Stripe webhook signing secret',
					},
				],
			} satisfies PluginMagnetProvider,
		]

		try {
			validateEnvironment(providers, undefined, { exitOnFailure: false })
			expect(true).toBe(false) // Should not reach here
		} catch (error) {
			const message = (error as Error).message
			expect(message).toContain('DATABASE_URL')
			expect(message).toContain('STRIPE_SECRET_KEY')
			expect(message).toContain('STRIPE_WEBHOOK_SECRET')
			expect(message).toContain('Database')
			expect(message).toContain('Plugin')
		}
	})

	it('should skip optional env vars', () => {
		process.env.DATABASE_URL = 'postgres://localhost/test'
		process.env.JWT_SECRET = 'test-secret'

		const providers: MagnetProvider[] = [
			{
				type: 'database',
				adapter: {} as DatabaseMagnetProvider['adapter'],
				config: { connectionString: '', dialect: 'postgresql' },
				envVars: [
					{ name: 'DATABASE_URL', required: true, description: 'DB URL' },
					{
						name: 'DATABASE_DEBUG',
						required: false,
						description: 'Debug mode',
					},
				],
			},
		]

		expect(() =>
			validateEnvironment(providers, undefined, { exitOnFailure: false }),
		).not.toThrow()
	})

	it('should treat empty string env vars as missing', () => {
		process.env.JWT_SECRET = 'test-secret'
		process.env.DATABASE_URL = ''

		const providers: MagnetProvider[] = [
			{
				type: 'database',
				adapter: {} as DatabaseMagnetProvider['adapter'],
				config: { connectionString: '', dialect: 'postgresql' },
				envVars: [
					{ name: 'DATABASE_URL', required: true, description: 'DB URL' },
				],
			},
		]

		expect(() =>
			validateEnvironment(providers, undefined, { exitOnFailure: false }),
		).toThrow()
	})

	it('should check JWT_SECRET from global options', () => {
		// JWT_SECRET not in env and not in global options
		expect(() =>
			validateEnvironment([], undefined, { exitOnFailure: false }),
		).toThrow('JWT_SECRET')
	})

	it('should not require JWT_SECRET when provided in global options', () => {
		process.env.JWT_SECRET = 'test-secret'

		expect(() =>
			validateEnvironment([], undefined, { exitOnFailure: false }),
		).not.toThrow()
	})

	it('should not require JWT_SECRET env var when secret is in global options', () => {
		const providers: MagnetProvider[] = []

		expect(() =>
			validateEnvironment(
				providers,
				{ jwt: { secret: 'explicit-secret' } },
				{
					exitOnFailure: false,
				},
			),
		).not.toThrow()
	})
})
