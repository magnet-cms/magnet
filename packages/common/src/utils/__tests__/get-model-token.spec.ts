import { describe, expect, it } from 'vitest'
import {
	getAdapterToken,
	getModelToken,
	getRegisteredModel,
	registerModel,
} from '../get-model-token.util'

describe('getModelToken', () => {
	it('returns uppercase token from string', () => {
		expect(getModelToken('Article')).toBe('MAGNET_MODEL_ARTICLE')
	})

	it('returns uppercase token from class', () => {
		class Article {}
		expect(getModelToken(Article)).toBe('MAGNET_MODEL_ARTICLE')
	})

	it('handles lowercase name', () => {
		expect(getModelToken('user')).toBe('MAGNET_MODEL_USER')
	})

	it('handles multi-word class name', () => {
		class BlogPost {}
		expect(getModelToken(BlogPost)).toBe('MAGNET_MODEL_BLOGPOST')
	})
})

describe('getAdapterToken', () => {
	it('returns MAGNET_DATABASE_ADAPTER', () => {
		expect(getAdapterToken()).toBe('MAGNET_DATABASE_ADAPTER')
	})
})

describe('registerModel / getRegisteredModel', () => {
	it('registers and retrieves a model', () => {
		const mockModel = { findMany: () => [] }
		registerModel('MAGNET_MODEL_TEST_REG', mockModel)
		expect(getRegisteredModel('MAGNET_MODEL_TEST_REG')).toBe(mockModel)
	})

	it('returns undefined for unregistered token', () => {
		expect(getRegisteredModel('MAGNET_MODEL_NONEXISTENT')).toBeUndefined()
	})
})
