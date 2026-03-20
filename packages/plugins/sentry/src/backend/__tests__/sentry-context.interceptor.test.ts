import { beforeEach, describe, expect, it, mock } from 'bun:test'
import Module from 'node:module'
import type { CallHandler, ExecutionContext } from '@nestjs/common'
import { of } from 'rxjs'

// Sentry mock for behavior tests
const mockSetUser = mock((_user: unknown) => {})
const mockSetTag = mock((_key: string, _value: string) => {})
const mockGetClient = mock<() => Record<string, unknown> | undefined>(() => ({
	isInitialized: true,
}))

const sentryMock = {
	setUser: mockSetUser,
	setTag: mockSetTag,
	getClient: mockGetClient,
}

function makeMockContext(
	user?: { id?: string },
	ip = '127.0.0.1',
): ExecutionContext {
	return {
		getType: () => 'http',
		switchToHttp: () => ({
			getRequest: () => ({ user, ip }),
		}),
	} as unknown as ExecutionContext
}

function makeMockHandler(value = {}): CallHandler {
	return {
		handle: () => of(value),
	}
}

function withSentryMock<T>(fn: () => T): T {
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

describe('SentryContextInterceptor', () => {
	beforeEach(() => {
		mockSetUser.mockClear()
		mockSetTag.mockClear()
		mockGetClient.mockClear()
		mockGetClient.mockImplementation(() => ({ isInitialized: true }))
	})

	it('should be importable', async () => {
		const { SentryContextInterceptor } = await import(
			'../interceptors/sentry-context.interceptor'
		)
		expect(SentryContextInterceptor).toBeDefined()
	})

	it('should implement NestInterceptor interface', async () => {
		const { SentryContextInterceptor } = await import(
			'../interceptors/sentry-context.interceptor'
		)
		const interceptor = new SentryContextInterceptor()
		expect(typeof interceptor.intercept).toBe('function')
	})

	it('should call setUser with authenticated user id and ip', async () => {
		const { SentryContextInterceptor } = await import(
			'../interceptors/sentry-context.interceptor'
		)
		const interceptor = new SentryContextInterceptor()
		const ctx = makeMockContext({ id: 'user-42' }, '192.168.1.1')
		const handler = makeMockHandler()

		await withSentryMock(async () => {
			const result = interceptor.intercept(ctx, handler)
			// Subscribe to trigger the observable
			await new Promise<void>((resolve) => {
				result.subscribe({ complete: resolve })
			})
		})

		expect(mockSetUser).toHaveBeenCalledWith({
			id: 'user-42',
			ip_address: '192.168.1.1',
		})
	})

	it('should call setUser with only ip when no authenticated user', async () => {
		const { SentryContextInterceptor } = await import(
			'../interceptors/sentry-context.interceptor'
		)
		const interceptor = new SentryContextInterceptor()
		const ctx = makeMockContext(undefined, '10.0.0.1')
		const handler = makeMockHandler()

		await withSentryMock(async () => {
			const result = interceptor.intercept(ctx, handler)
			await new Promise<void>((resolve) => {
				result.subscribe({ complete: resolve })
			})
		})

		expect(mockSetUser).toHaveBeenCalledWith({ ip_address: '10.0.0.1' })
	})

	it('should skip enrichment when Sentry client is not initialized', async () => {
		mockGetClient.mockImplementation(() => undefined)
		const { SentryContextInterceptor } = await import(
			'../interceptors/sentry-context.interceptor'
		)
		const interceptor = new SentryContextInterceptor()
		const ctx = makeMockContext({ id: 'user-99' })
		const handler = makeMockHandler()

		await withSentryMock(async () => {
			const result = interceptor.intercept(ctx, handler)
			await new Promise<void>((resolve) => {
				result.subscribe({ complete: resolve })
			})
		})

		expect(mockSetUser).not.toHaveBeenCalled()
	})

	it('should skip enrichment for non-HTTP contexts', async () => {
		const { SentryContextInterceptor } = await import(
			'../interceptors/sentry-context.interceptor'
		)
		const interceptor = new SentryContextInterceptor()
		const ctx = {
			getType: () => 'rpc',
			switchToHttp: () => ({ getRequest: () => ({}) }),
		} as unknown as ExecutionContext
		const handler = makeMockHandler()

		await withSentryMock(async () => {
			const result = interceptor.intercept(ctx, handler)
			await new Promise<void>((resolve) => {
				result.subscribe({ complete: resolve })
			})
		})

		expect(mockSetUser).not.toHaveBeenCalled()
	})

	it('should be a no-op when @sentry/nestjs is not installed', async () => {
		const { SentryContextInterceptor } = await import(
			'../interceptors/sentry-context.interceptor'
		)
		const interceptor = new SentryContextInterceptor()
		const ctx = makeMockContext({ id: 'user-1' })
		const handler = makeMockHandler()

		const orig = Module.prototype.require
		;(Module.prototype as unknown as Record<string, unknown>).require =
			function (this: NodeModule, id: string) {
				if (id === '@sentry/nestjs') throw new Error('Cannot find module')
				return orig.apply(this, [id] as unknown as [string])
			}

		try {
			let threw = false
			const result = interceptor.intercept(ctx, handler)
			await new Promise<void>((resolve) => {
				result.subscribe({
					complete: resolve,
					error: () => {
						threw = true
						resolve()
					},
				})
			})
			expect(threw).toBe(false)
		} finally {
			Module.prototype.require = orig
		}
	})
})
