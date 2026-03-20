import { describe, expect, it } from 'bun:test'

/**
 * NestJS HTTP method decorators (@Get, @Post, etc.) use the legacy 3-arg form
 * and throw on first import in Bun's TC39 stage-3 decorator context.
 * The class IS successfully cached after the first load, so subsequent imports
 * work correctly. We use a try/catch-then-retry pattern for the first import.
 */
async function importController() {
	try {
		return await import('../controllers/sentry-config.controller')
	} catch {
		// Second import returns the cached module (class was created successfully)
		return await import('../controllers/sentry-config.controller')
	}
}

describe('SentryConfigController', () => {
	it('should export SentryConfigController', async () => {
		const mod = await importController()
		expect(typeof mod.SentryConfigController).toBe('function')
	})

	it('should have a getConfig method', async () => {
		const { SentryConfigController } = await importController()
		type WithGetConfig = { getConfig: () => unknown }
		const proto = SentryConfigController.prototype as WithGetConfig
		expect(typeof proto.getConfig).toBe('function')
	})

	it('should return config with dsn, enabled, and environment', async () => {
		const { SentryConfigController } = await importController()
		const controller = new SentryConfigController({
			dsn: 'https://abc@o0.ingest.sentry.io/123',
			enabled: true,
			environment: 'test',
		})
		type WithGetConfig = {
			getConfig: () => { dsn: string; enabled: boolean; environment: string }
		}
		const result = (controller as unknown as WithGetConfig).getConfig()
		expect(result.dsn).toBe('https://abc@o0.ingest.sentry.io/123')
		expect(result.enabled).toBe(true)
		expect(result.environment).toBe('test')
	})

	it('should use defaults when config fields are missing', async () => {
		const { SentryConfigController } = await importController()
		const controller = new SentryConfigController({})
		type WithGetConfig = {
			getConfig: () => { dsn: string; enabled: boolean; environment: string }
		}
		const result = (controller as unknown as WithGetConfig).getConfig()
		expect(result.dsn).toBe('')
		expect(result.enabled).toBe(true)
		expect(typeof result.environment).toBe('string')
	})
})
