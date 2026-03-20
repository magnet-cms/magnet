import { beforeEach, describe, expect, it, mock } from 'bun:test'
import Module from 'node:module'

// Sentry mock for lifecycle tests
const mockInit = mock((_opts: unknown) => {})
const mockClose = mock(async (_timeout: number) => true)
const mockGetClientUninitialized = mock<() => undefined>(() => undefined)
const mockGetClientInitialized = mock<() => Record<string, unknown>>(() => ({
	isInitialized: true,
}))

const sentryMockUninitialized = {
	init: mockInit,
	close: mockClose,
	getClient: mockGetClientUninitialized,
}

const sentryMockInitialized = {
	init: mockInit,
	close: mockClose,
	getClient: mockGetClientInitialized,
}

function withSentryMock<T>(
	sentryMock: Record<string, unknown>,
	fn: () => T,
): T {
	const orig = Module.prototype.require
	;(Module.prototype as unknown as Record<string, unknown>).require = function (
		this: NodeModule,
		id: string,
	) {
		if (id === '@sentry/nestjs') return sentryMock
		return orig.apply(this, [id] as unknown as [string])
	}
	try {
		return fn()
	} finally {
		Module.prototype.require = orig
	}
}

describe('SentryPlugin.forRoot()', () => {
	it('should return a PluginMagnetProvider with type "plugin"', async () => {
		process.env.SENTRY_DSN = 'https://test@o0.ingest.sentry.io/0'
		const { SentryPlugin } = await import('../plugin')
		const result = SentryPlugin.forRoot()
		expect(result.type).toBe('plugin')
	})

	it('should include plugin class reference', async () => {
		const { SentryPlugin } = await import('../plugin')
		const result = SentryPlugin.forRoot()
		expect(result.plugin).toBe(SentryPlugin)
	})

	it('should resolve DSN from argument when provided', async () => {
		const { SentryPlugin } = await import('../plugin')
		SentryPlugin.forRoot({ dsn: 'https://explicit@o0.ingest.sentry.io/0' })
		expect(SentryPlugin._resolvedConfig?.dsn).toBe(
			'https://explicit@o0.ingest.sentry.io/0',
		)
	})

	it('should resolve DSN from SENTRY_DSN env var when not provided', async () => {
		process.env.SENTRY_DSN = 'https://fromenv@o0.ingest.sentry.io/0'
		const { SentryPlugin } = await import('../plugin')
		SentryPlugin.forRoot()
		expect(SentryPlugin._resolvedConfig?.dsn).toBe(
			'https://fromenv@o0.ingest.sentry.io/0',
		)
	})

	it('should include SENTRY_DSN in envVars', async () => {
		const { SentryPlugin } = await import('../plugin')
		const result = SentryPlugin.forRoot()
		const dsnVar = result.envVars.find((v) => v.name === 'SENTRY_DSN')
		expect(dsnVar).toBeDefined()
		expect(dsnVar?.required).toBe(true)
	})

	it('should store options including tracesSampleRate', async () => {
		const { SentryPlugin } = await import('../plugin')
		SentryPlugin.forRoot({ tracesSampleRate: 0.5 })
		expect(SentryPlugin._resolvedConfig?.tracesSampleRate).toBe(0.5)
	})

	it('should NOT use as unknown as cast — options is a plain spread object', async () => {
		const { SentryPlugin } = await import('../plugin')
		const result = SentryPlugin.forRoot({
			dsn: 'https://x@o0.ingest.sentry.io/1',
			tracesSampleRate: 0.2,
		})
		// options should be a plain object (spread), not a reference to _resolvedConfig
		expect(result.options).not.toBe(SentryPlugin._resolvedConfig)
		expect((result.options as { dsn?: string }).dsn).toBe(
			'https://x@o0.ingest.sentry.io/1',
		)
	})
})

describe('SentryPlugin.onPluginInit()', () => {
	beforeEach(() => {
		mockInit.mockClear()
		mockClose.mockClear()
		mockGetClientUninitialized.mockClear()
	})

	it('should call Sentry.init() with resolved config when not yet initialized', async () => {
		const { SentryPlugin } = await import('../plugin')
		SentryPlugin.forRoot({
			dsn: 'https://test@o0.ingest.sentry.io/0',
			tracesSampleRate: 0.5,
		})
		const plugin = new SentryPlugin()

		await withSentryMock(sentryMockUninitialized, async () => {
			await plugin.onPluginInit()
		})

		expect(mockInit).toHaveBeenCalledTimes(1)
		const initArg = mockInit.mock.calls[0]?.[0] as {
			dsn?: string
			tracesSampleRate?: number
		}
		expect(initArg?.dsn).toBe('https://test@o0.ingest.sentry.io/0')
		expect(initArg?.tracesSampleRate).toBe(0.5)
	})

	it('should skip Sentry.init() when Sentry is already initialized', async () => {
		const { SentryPlugin } = await import('../plugin')
		SentryPlugin.forRoot({ dsn: 'https://test@o0.ingest.sentry.io/0' })
		const plugin = new SentryPlugin()

		await withSentryMock(sentryMockInitialized, async () => {
			await plugin.onPluginInit()
		})

		expect(mockInit).not.toHaveBeenCalled()
	})

	it('should be a no-op when enabled is false', async () => {
		const { SentryPlugin } = await import('../plugin')
		SentryPlugin.forRoot({
			dsn: 'https://test@o0.ingest.sentry.io/0',
			enabled: false,
		})
		const plugin = new SentryPlugin()

		await withSentryMock(sentryMockUninitialized, async () => {
			await plugin.onPluginInit()
		})

		expect(mockInit).not.toHaveBeenCalled()
	})

	it('should be a no-op when @sentry/nestjs is not installed', async () => {
		const { SentryPlugin } = await import('../plugin')
		SentryPlugin.forRoot({ dsn: 'https://test@o0.ingest.sentry.io/0' })
		const plugin = new SentryPlugin()

		const orig = Module.prototype.require
		;(Module.prototype as unknown as Record<string, unknown>).require =
			function (this: NodeModule, id: string) {
				if (id === '@sentry/nestjs') throw new Error('Cannot find module')
				return orig.apply(this, [id] as unknown as [string])
			}
		try {
			let threw = false
			try {
				await plugin.onPluginInit()
			} catch {
				threw = true
			}
			expect(threw).toBe(false)
		} finally {
			Module.prototype.require = orig
		}
	})
})

describe('SentryPlugin.onPluginDestroy()', () => {
	beforeEach(() => {
		mockClose.mockClear()
	})

	it('should call Sentry.close() with a 2000ms timeout', async () => {
		const { SentryPlugin } = await import('../plugin')
		const plugin = new SentryPlugin()

		await withSentryMock(sentryMockUninitialized, async () => {
			await plugin.onPluginDestroy()
		})

		expect(mockClose).toHaveBeenCalledTimes(1)
		expect(mockClose).toHaveBeenCalledWith(2000)
	})

	it('should be a no-op when @sentry/nestjs is not installed', async () => {
		const { SentryPlugin } = await import('../plugin')
		const plugin = new SentryPlugin()

		const orig = Module.prototype.require
		;(Module.prototype as unknown as Record<string, unknown>).require =
			function (this: NodeModule, id: string) {
				if (id === '@sentry/nestjs') throw new Error('Cannot find module')
				return orig.apply(this, [id] as unknown as [string])
			}
		try {
			let threw = false
			try {
				await plugin.onPluginDestroy()
			} catch {
				threw = true
			}
			expect(threw).toBe(false)
		} finally {
			Module.prototype.require = orig
		}
	})
})

describe('initSentryInstrumentation()', () => {
	it('should be a callable function', async () => {
		const { initSentryInstrumentation } = await import('../instrumentation')
		expect(typeof initSentryInstrumentation).toBe('function')
	})
})
