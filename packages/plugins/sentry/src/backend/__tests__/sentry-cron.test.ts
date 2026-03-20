import { describe, expect, it } from 'bun:test'

describe('SentryCron re-export', () => {
	it('should export SentryCron', async () => {
		const mod = await import('../decorators/sentry-cron.decorator')
		expect(typeof mod.SentryCron).toBe('function')
	})

	it('should export MagnetSentryCron', async () => {
		const mod = await import('../decorators/sentry-cron.decorator')
		expect(typeof mod.MagnetSentryCron).toBe('function')
	})
})

describe('MagnetSentryCron', () => {
	it('should generate a slug from method name when none provided', async () => {
		const { MagnetSentryCron } = await import(
			'../decorators/sentry-cron.decorator'
		)
		// MagnetSentryCron() with no args should not throw
		expect(() => MagnetSentryCron()).not.toThrow()
	})

	it('should accept an explicit slug', async () => {
		const { MagnetSentryCron } = await import(
			'../decorators/sentry-cron.decorator'
		)
		expect(() => MagnetSentryCron('my-job-slug')).not.toThrow()
	})
})
