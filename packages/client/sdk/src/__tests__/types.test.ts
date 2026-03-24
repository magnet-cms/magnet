import { describe, expect, it } from 'vitest'
import type { MagnetClientConfig, MagnetResponse } from '../types'

describe('MagnetClientConfig', () => {
	it('should accept baseUrl only', () => {
		const config: MagnetClientConfig = { baseUrl: 'http://localhost:3000' }
		expect(config.baseUrl).toBe('http://localhost:3000')
	})

	it('should accept token and apiKey', () => {
		const config: MagnetClientConfig = {
			baseUrl: 'http://localhost:3000',
			token: 'jwt-token',
			apiKey: 'api-key',
			headers: { 'x-tenant': 'acme' },
		}
		expect(config.token).toBe('jwt-token')
		expect(config.apiKey).toBe('api-key')
		expect(config.headers?.['x-tenant']).toBe('acme')
	})
})

describe('MagnetResponse', () => {
	it('should type data and error as optional', () => {
		const res: MagnetResponse<{ id: string }> = { data: { id: '1' } }
		expect(res.data?.id).toBe('1')
		expect(res.error).toBeUndefined()
	})
})
