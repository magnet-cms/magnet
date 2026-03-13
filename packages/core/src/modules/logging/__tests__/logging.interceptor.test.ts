import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import type { CallHandler, ExecutionContext } from '@nestjs/common'
import { of, throwError } from 'rxjs'
import { MagnetLogger } from '../logger.service'
import { LoggingInterceptor } from '../logging.interceptor'

function makeContext(method = 'GET', url = '/api/test'): ExecutionContext {
	return {
		switchToHttp: () => ({
			getRequest: () => ({ method, url, ip: '127.0.0.1' }),
			getResponse: () => ({ statusCode: 200 }),
		}),
		getType: () => 'http',
	} as unknown as ExecutionContext
}

function makeHandler(value = { ok: true }): CallHandler {
	return { handle: () => of(value) }
}

function makeErrorHandler(err: Error): CallHandler {
	return { handle: () => throwError(() => err) }
}

describe('LoggingInterceptor', () => {
	let interceptor: LoggingInterceptor
	let logger: MagnetLogger
	let logSpy: ReturnType<typeof spyOn>
	let warnSpy: ReturnType<typeof spyOn>
	let stdoutSpy: ReturnType<typeof spyOn>

	beforeEach(() => {
		process.env.LOG_FORMAT = undefined
		logger = new MagnetLogger()
		interceptor = new LoggingInterceptor(logger)
		logSpy = spyOn(logger, 'log').mockImplementation(() => {})
		warnSpy = spyOn(logger, 'warn').mockImplementation(() => {})
		stdoutSpy = spyOn(process.stdout, 'write').mockImplementation(() => true)
	})

	afterEach(() => {
		logSpy.mockRestore()
		warnSpy.mockRestore()
		stdoutSpy.mockRestore()
	})

	it('should call logger.log on successful request', (done) => {
		const ctx = makeContext('GET', '/api/test')
		const handler = makeHandler()

		interceptor.intercept(ctx, handler).subscribe({
			complete: () => {
				expect(logSpy).toHaveBeenCalled()
				done()
			},
			error: done,
		})
	})

	it('should log method and path', (done) => {
		const ctx = makeContext('POST', '/api/users')
		const handler = makeHandler()

		interceptor.intercept(ctx, handler).subscribe({
			complete: () => {
				const callArgs = logSpy.mock.calls[0]
				expect(callArgs?.[0]).toContain('POST')
				expect(callArgs?.[0]).toContain('/api/users')
				done()
			},
			error: done,
		})
	})

	it('should log duration in metadata', (done) => {
		const ctx = makeContext('GET', '/api/test')
		const handler = makeHandler()

		interceptor.intercept(ctx, handler).subscribe({
			complete: () => {
				const metadata = logSpy.mock.calls[0]?.[1] as Record<string, unknown>
				expect(typeof metadata?.duration).toBe('number')
				done()
			},
			error: done,
		})
	})

	it('should log statusCode in metadata', (done) => {
		const ctx = makeContext('GET', '/api/test')
		const handler = makeHandler()

		interceptor.intercept(ctx, handler).subscribe({
			complete: () => {
				const metadata = logSpy.mock.calls[0]?.[1] as Record<string, unknown>
				expect(metadata?.statusCode).toBeDefined()
				done()
			},
			error: done,
		})
	})

	it('should pass through response value unchanged', (done) => {
		const ctx = makeContext()
		const handler = makeHandler({ id: 42, name: 'test' })
		const received: unknown[] = []

		interceptor.intercept(ctx, handler).subscribe({
			next: (v) => received.push(v),
			complete: () => {
				expect(received[0]).toEqual({ id: 42, name: 'test' })
				done()
			},
			error: done,
		})
	})

	it('should re-throw errors so NestJS exception filters handle them', (done) => {
		const ctx = makeContext()
		const handler = makeErrorHandler(new Error('db error'))

		interceptor.intercept(ctx, handler).subscribe({
			next: () => done(new Error('should not emit')),
			error: (err: Error) => {
				expect(err.message).toBe('db error')
				done()
			},
		})
	})
})
