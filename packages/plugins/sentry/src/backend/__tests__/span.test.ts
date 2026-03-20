import { describe, expect, it, mock } from 'bun:test'

// Mock @sentry/nestjs startSpan
const mockStartSpan = mock(
	async <T>(
		_options: { name: string; op?: string },
		fn: (span: unknown) => Promise<T>,
	) => fn({}),
)

// We test withSentrySpan and SentrySpan decorator
describe('withSentrySpan()', () => {
	it('should be importable', async () => {
		const { withSentrySpan } = await import('../helpers/span')
		expect(typeof withSentrySpan).toBe('function')
	})

	it('should execute the callback and return its result', async () => {
		const { withSentrySpan } = await import('../helpers/span')
		const result = await withSentrySpan(
			'test-op',
			'my.operation',
			async () => 42,
		)
		expect(result).toBe(42)
	})

	it('should be a no-op when Sentry is not initialized', async () => {
		const { withSentrySpan } = await import('../helpers/span')
		// Even without Sentry initialized, the callback should still run
		const called = { value: false }
		await withSentrySpan('test', 'op', async () => {
			called.value = true
		})
		expect(called.value).toBe(true)
	})
})

describe('SentrySpan decorator', () => {
	it('should be importable', async () => {
		const { SentrySpan } = await import('../decorators/sentry-span.decorator')
		expect(typeof SentrySpan).toBe('function')
	})

	it('should wrap a method and preserve its return value', async () => {
		const { SentrySpan } = await import('../decorators/sentry-span.decorator')

		class TestService {
			@SentrySpan('test-span')
			async doWork(): Promise<number> {
				return 99
			}
		}

		const service = new TestService()
		const result = await service.doWork()
		expect(result).toBe(99)
	})

	it('should propagate errors from decorated methods', async () => {
		const { SentrySpan } = await import('../decorators/sentry-span.decorator')

		class TestService {
			@SentrySpan('error-span')
			async failingWork(): Promise<never> {
				throw new Error('expected error')
			}
		}

		const service = new TestService()
		let caught: Error | undefined
		try {
			await service.failingWork()
		} catch (e) {
			caught = e as Error
		}
		expect(caught?.message).toBe('expected error')
	})
})
