import { describe, expect, it } from 'vitest'
import type { MagnetGlobalOptions } from '../provider.types'

describe('MagnetGlobalOptions — openapi field', () => {
	it('should accept openapi: false to disable', () => {
		const opts: MagnetGlobalOptions = { openapi: false }
		expect(opts.openapi).toBe(false)
	})

	it('should accept openapi as a config object', () => {
		const opts: MagnetGlobalOptions = {
			openapi: { title: 'My API', version: '2.0.0', path: '/docs' },
		}
		expect((opts.openapi as { title?: string })?.title).toBe('My API')
	})

	it('should accept openapi: { enabled: false }', () => {
		const opts: MagnetGlobalOptions = { openapi: { enabled: false } }
		expect((opts.openapi as { enabled?: boolean })?.enabled).toBe(false)
	})

	it('should accept undefined openapi (default enabled)', () => {
		const opts: MagnetGlobalOptions = {}
		expect(opts.openapi).toBeUndefined()
	})
})
