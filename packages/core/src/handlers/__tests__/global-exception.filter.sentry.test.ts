import { beforeEach, describe, expect, it, mock } from 'bun:test'
import Module from 'node:module'
import type { ArgumentsHost } from '@nestjs/common'
import { MagnetLogger } from '~/modules/logging/logger.service'
import { GlobalExceptionFilter } from '../global-exception.filter'

/**
 * Tests for the conditional Sentry integration in GlobalExceptionFilter.
 * Verifies that Sentry.captureException() is called when Sentry is initialized,
 * and that the filter continues to work normally when Sentry is absent.
 */

function makeHost(url = '/api/test', method = 'GET'): ArgumentsHost {
	const response = {
		status: mock(() => response),
		json: mock(() => {}),
	}
	return {
		switchToHttp: () => ({
			getResponse: () => response,
			getRequest: () => ({
				url,
				method,
				user: { id: 'user-123' },
				ip: '127.0.0.1',
			}),
		}),
	} as unknown as ArgumentsHost
}

describe('GlobalExceptionFilter — Sentry integration', () => {
	let filter: GlobalExceptionFilter
	let logger: MagnetLogger

	beforeEach(() => {
		logger = new MagnetLogger()
		filter = new GlobalExceptionFilter(logger)
	})

	it('should call captureException when Sentry client is initialized', () => {
		const captureException = mock((_e: unknown) => 'event-id')
		const getClient = mock(() => ({
			/* initialized client */
		}))

		// Temporarily override require for @sentry/nestjs
		const origRequire = Module.prototype.require
		;(Module.prototype as unknown as Record<string, unknown>).require =
			function (this: NodeModule, id: string) {
				if (id === '@sentry/nestjs') {
					return { captureException, getClient }
				}
				return origRequire.apply(this, [id] as unknown as [string])
			}

		const host = makeHost()
		const error = new Error('test error')

		try {
			filter.catch(error, host)
		} finally {
			Module.prototype.require = origRequire
		}

		expect(captureException).toHaveBeenCalledTimes(1)
		expect(captureException).toHaveBeenCalledWith(error)
	})

	it('should NOT call captureException when Sentry client is not initialized', () => {
		const captureException = mock((_e: unknown) => 'event-id')
		const getClient = mock(() => undefined) // not initialized

		const origRequire = Module.prototype.require
		;(Module.prototype as unknown as Record<string, unknown>).require =
			function (this: NodeModule, id: string) {
				if (id === '@sentry/nestjs') {
					return { captureException, getClient }
				}
				return origRequire.apply(this, [id] as unknown as [string])
			}

		const host = makeHost()
		const error = new Error('test error')

		try {
			filter.catch(error, host)
		} finally {
			Module.prototype.require = origRequire
		}

		expect(captureException).not.toHaveBeenCalled()
	})

	it('should work normally when @sentry/nestjs is not installed', () => {
		const origRequire = Module.prototype.require
		;(Module.prototype as unknown as Record<string, unknown>).require =
			function (this: NodeModule, id: string) {
				if (id === '@sentry/nestjs') {
					throw new Error('Cannot find module')
				}
				return origRequire.apply(this, [id] as unknown as [string])
			}

		const host = makeHost()
		const error = new Error('test error without sentry')

		let threw = false
		try {
			filter.catch(error, host)
		} catch {
			threw = true
		} finally {
			Module.prototype.require = origRequire
		}

		expect(threw).toBe(false)
	})

	it('should still return error response when Sentry is active', () => {
		const captureException = mock((_e: unknown) => 'event-id')
		const getClient = mock(() => ({}))

		const origRequire = Module.prototype.require
		;(Module.prototype as unknown as Record<string, unknown>).require =
			function (this: NodeModule, id: string) {
				if (id === '@sentry/nestjs') {
					return { captureException, getClient }
				}
				return origRequire.apply(this, [id] as unknown as [string])
			}

		const response = {
			status: mock(function () {
				return this
			}),
			json: mock(() => {}),
		}
		const host = {
			switchToHttp: () => ({
				getResponse: () => response,
				getRequest: () => ({ url: '/test', method: 'GET', user: undefined }),
			}),
		} as unknown as ArgumentsHost

		const error = new Error('with sentry active')

		try {
			filter.catch(error, host)
		} finally {
			Module.prototype.require = origRequire
		}

		// Response was sent (filter still formats the response)
		expect(response.status).toHaveBeenCalledTimes(1)
		expect(response.json).toHaveBeenCalledTimes(1)
	})
})
