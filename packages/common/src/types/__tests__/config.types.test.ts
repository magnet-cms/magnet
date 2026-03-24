import { describe, expect, it } from 'vitest'
import type { OpenAPIConfig } from '../config.types'

/**
 * Runtime shape tests for OpenAPIConfig.
 * Since the interface has no runtime logic, these tests verify
 * that valid config objects satisfy the interface (type narrowing at runtime).
 */
describe('OpenAPIConfig', () => {
	it('should accept an empty object', () => {
		const config: OpenAPIConfig = {}
		expect(config).toBeDefined()
	})

	it('should accept all fields', () => {
		const config: OpenAPIConfig = {
			enabled: true,
			path: '/api-docs',
			title: 'My API',
			version: '2.0.0',
		}
		expect(config.enabled).toBe(true)
		expect(config.path).toBe('/api-docs')
		expect(config.title).toBe('My API')
		expect(config.version).toBe('2.0.0')
	})

	it('should allow disabling via enabled: false', () => {
		const config: OpenAPIConfig = { enabled: false }
		expect(config.enabled).toBe(false)
	})
})
