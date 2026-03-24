import { describe, expect, it } from 'vitest'
import { createMagnetClient } from '../index'

describe('client SDK barrel exports', () => {
	it('should export createMagnetClient', () => {
		expect(createMagnetClient).toBeDefined()
		expect(typeof createMagnetClient).toBe('function')
	})
})
