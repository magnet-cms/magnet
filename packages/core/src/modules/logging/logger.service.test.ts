import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { eventContextStorage } from '~/modules/events/event-context.interceptor'
import { MagnetLogger } from './logger.service'

describe('MagnetLogger', () => {
	let stdoutSpy: ReturnType<typeof spyOn>
	let stderrSpy: ReturnType<typeof spyOn>

	beforeEach(() => {
		process.env.LOG_LEVEL = undefined
		process.env.LOG_FORMAT = undefined
		process.env.LOG_TIMESTAMPS = undefined
		process.env.LOG_STACK_TRACES = undefined
		stdoutSpy = spyOn(process.stdout, 'write').mockImplementation(() => true)
		stderrSpy = spyOn(process.stderr, 'write').mockImplementation(() => true)
	})

	afterEach(() => {
		stdoutSpy.mockRestore()
		stderrSpy.mockRestore()
	})

	function makeLogger(context = 'TestService'): MagnetLogger {
		const l = new MagnetLogger()
		l.setContext(context)
		return l
	}

	function lastStdout(): string {
		return stdoutSpy.mock.calls.at(-1)?.[0] as string
	}

	function lastStderr(): string {
		return stderrSpy.mock.calls.at(-1)?.[0] as string
	}

	describe('log level filtering', () => {
		it('should output info logs by default', () => {
			makeLogger().log('test message')
			expect(stdoutSpy).toHaveBeenCalled()
		})

		it('should suppress debug logs when level=info', () => {
			makeLogger().debug?.('debug message')
			expect(stdoutSpy).not.toHaveBeenCalled()
		})

		it('should output debug logs when LOG_LEVEL=debug', () => {
			process.env.LOG_LEVEL = 'debug'
			makeLogger().debug?.('debug message')
			expect(stdoutSpy).toHaveBeenCalled()
		})

		it('should suppress info when LOG_LEVEL=error', () => {
			process.env.LOG_LEVEL = 'error'
			makeLogger().log('info message')
			expect(stdoutSpy).not.toHaveBeenCalled()
		})

		it('should output error logs when LOG_LEVEL=error', () => {
			process.env.LOG_LEVEL = 'error'
			makeLogger().error('error message')
			expect(stderrSpy).toHaveBeenCalled()
		})
	})

	describe('JSON format', () => {
		it('should produce valid JSON output', () => {
			process.env.LOG_FORMAT = 'json'
			makeLogger().log('test message')

			expect(stdoutSpy).toHaveBeenCalled()
			expect(() => JSON.parse(lastStdout())).not.toThrow()
		})

		it('should include required fields in JSON output', () => {
			process.env.LOG_FORMAT = 'json'
			makeLogger('MyContext').log('hello world')

			const parsed = JSON.parse(lastStdout())
			expect(parsed.level).toBe('info')
			expect(parsed.message).toBe('hello world')
			expect(parsed.context).toBe('MyContext')
		})
	})

	describe('redaction', () => {
		it('should redact password field in metadata', () => {
			process.env.LOG_FORMAT = 'json'
			makeLogger().log('login attempt', {
				password: 'secret123',
				userId: 'abc',
			})

			const parsed = JSON.parse(lastStdout())
			expect(parsed.metadata.password).toBe('[REDACTED]')
			expect(parsed.metadata.userId).toBe('abc')
		})

		it('should redact token field in metadata', () => {
			process.env.LOG_FORMAT = 'json'
			makeLogger().log('api call', { token: 'abc123', path: '/api' })

			const parsed = JSON.parse(lastStdout())
			expect(parsed.metadata.token).toBe('[REDACTED]')
			expect(parsed.metadata.path).toBe('/api')
		})

		it('should redact authorization field in metadata', () => {
			process.env.LOG_FORMAT = 'json'
			makeLogger().log('request', {
				authorization: 'Bearer xyz',
				method: 'GET',
			})

			const parsed = JSON.parse(lastStdout())
			expect(parsed.metadata.authorization).toBe('[REDACTED]')
		})
	})

	describe('request context enrichment', () => {
		it('should include requestId from EventContext when inside request', () => {
			process.env.LOG_FORMAT = 'json'
			const l = makeLogger()
			eventContextStorage.run(
				{ requestId: 'test-req-123', userId: 'user-1' },
				() => {
					l.log('test in context')
				},
			)

			const parsed = JSON.parse(lastStdout())
			expect(parsed.requestId).toBe('test-req-123')
			expect(parsed.userId).toBe('user-1')
		})

		it('should not include requestId outside request context', () => {
			process.env.LOG_FORMAT = 'json'
			makeLogger().log('test outside context')

			const parsed = JSON.parse(lastStdout())
			expect(parsed.requestId).toBeUndefined()
		})
	})

	describe('context management', () => {
		it('should set context via setContext()', () => {
			process.env.LOG_FORMAT = 'json'
			makeLogger('MyService').log('test')

			const parsed = JSON.parse(lastStdout())
			expect(parsed.context).toBe('MyService')
		})
	})

	describe('error logging', () => {
		it('should write error logs to stderr', () => {
			process.env.LOG_FORMAT = 'json'
			makeLogger().error('operation failed', new Error('something broke').stack)

			const parsed = JSON.parse(lastStderr())
			expect(parsed.level).toBe('error')
			expect(parsed.message).toBe('operation failed')
		})

		it('should include error name and message when passed an Error object', () => {
			process.env.LOG_FORMAT = 'json'
			makeLogger().error('operation failed', new Error('something broke'))

			const parsed = JSON.parse(lastStderr())
			expect(parsed.error.name).toBe('Error')
			expect(parsed.error.message).toBe('something broke')
		})
	})

	describe('static create()', () => {
		it('should create a standalone logger with given context', () => {
			process.env.LOG_FORMAT = 'json'
			MagnetLogger.create('Bootstrap').log('starting')

			const parsed = JSON.parse(lastStdout())
			expect(parsed.context).toBe('Bootstrap')
		})
	})

	describe('child()', () => {
		it('should return a child logger with parent:child context', () => {
			process.env.LOG_FORMAT = 'json'
			makeLogger('Parent').child('Child').log('nested log')

			const parsed = JSON.parse(lastStdout())
			expect(parsed.context).toBe('Parent:Child')
		})
	})
})
