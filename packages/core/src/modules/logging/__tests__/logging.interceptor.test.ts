import type { CallHandler, ExecutionContext } from '@nestjs/common'
import { firstValueFrom, lastValueFrom, of, throwError } from 'rxjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
	let logSpy: ReturnType<typeof vi.spyOn>
	let warnSpy: ReturnType<typeof vi.spyOn>
	let stdoutSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		process.env.LOG_FORMAT = undefined
		logger = new MagnetLogger()
		interceptor = new LoggingInterceptor(logger)
		logSpy = vi.spyOn(logger, 'log').mockImplementation(() => {})
		warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
		stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
	})

	afterEach(() => {
		logSpy.mockRestore()
		warnSpy.mockRestore()
		stdoutSpy.mockRestore()
	})

	it('should call logger.log on successful request', async () => {
		const ctx = makeContext('GET', '/api/test')
		const handler = makeHandler()

		await lastValueFrom(interceptor.intercept(ctx, handler))
		expect(logSpy).toHaveBeenCalled()
	})

	it('should log method and path', async () => {
		const ctx = makeContext('POST', '/api/users')
		const handler = makeHandler()

		await lastValueFrom(interceptor.intercept(ctx, handler))
		const callArgs = logSpy.mock.calls[0]
		expect(callArgs?.[0]).toContain('POST')
		expect(callArgs?.[0]).toContain('/api/users')
	})

	it('should log duration in metadata', async () => {
		const ctx = makeContext('GET', '/api/test')
		const handler = makeHandler()

		await lastValueFrom(interceptor.intercept(ctx, handler))
		const metadata = logSpy.mock.calls[0]?.[1] as Record<string, unknown>
		expect(typeof metadata?.duration).toBe('number')
	})

	it('should log statusCode in metadata', async () => {
		const ctx = makeContext('GET', '/api/test')
		const handler = makeHandler()

		await lastValueFrom(interceptor.intercept(ctx, handler))
		const metadata = logSpy.mock.calls[0]?.[1] as Record<string, unknown>
		expect(metadata?.statusCode).toBeDefined()
	})

	it('should pass through response value unchanged', async () => {
		const ctx = makeContext()
		const handler = makeHandler({ id: 42, name: 'test' })

		const value = await firstValueFrom(interceptor.intercept(ctx, handler))
		expect(value).toEqual({ id: 42, name: 'test' })
	})

	it('should re-throw errors so NestJS exception filters handle them', async () => {
		const ctx = makeContext()
		const handler = makeErrorHandler(new Error('db error'))

		await expect(
			firstValueFrom(interceptor.intercept(ctx, handler)),
		).rejects.toMatchObject({ message: 'db error' })
	})
})
