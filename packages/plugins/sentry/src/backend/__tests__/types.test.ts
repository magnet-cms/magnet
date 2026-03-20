import { describe, expect, it } from 'bun:test'
import type { SentryPluginConfig } from '../types'

describe('SentryPluginConfig', () => {
	it('should accept an empty config object', () => {
		const config: SentryPluginConfig = {}
		expect(config).toBeDefined()
	})

	it('should accept a fully populated config object', () => {
		const config: SentryPluginConfig = {
			dsn: 'https://abc123@o0.ingest.sentry.io/0',
			tracesSampleRate: 0.5,
			profileSessionSampleRate: 1.0,
			environment: 'production',
			release: 'v1.0.0',
			debug: false,
			enabled: true,
			attachStacktrace: true,
			maxBreadcrumbs: 100,
		}
		expect(config.dsn).toBe('https://abc123@o0.ingest.sentry.io/0')
		expect(config.tracesSampleRate).toBe(0.5)
		expect(config.environment).toBe('production')
	})

	it('should allow dsn to be undefined (auto-resolved from env)', () => {
		const config: SentryPluginConfig = { environment: 'development' }
		expect(config.dsn).toBeUndefined()
	})
})
