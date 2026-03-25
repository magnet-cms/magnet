import { describe, expect, it } from 'vitest'
import { capitalize, extractTextFromLexical, names, pluralize } from '../text'

describe('capitalize', () => {
	it('capitalizes first letter', () => {
		expect(capitalize('hello')).toBe('Hello')
		expect(capitalize('world')).toBe('World')
	})

	it('handles already capitalized', () => {
		expect(capitalize('Hello')).toBe('Hello')
	})

	it('handles empty string', () => {
		expect(capitalize('')).toBe('')
	})
})

describe('names', () => {
	it('returns all name variants for a kebab string', () => {
		const result = names('medical-record')
		expect(result.name).toBe('medical-record')
		expect(result.className).toBe('Medical-record') // capitalize only first letter of full name
		expect(result.propertyName).toBe('medicalRecord')
		expect(result.constantName).toBe('MEDICAL_RECORD')
		expect(result.fileName).toBe('medical-record')
		expect(result.title).toBe('Medical Record')
		expect(result.key).toBe('medical_record')
	})

	it('converts camelCase input to kebab name', () => {
		const result = names('mySchema')
		expect(result.name).toBe('my-schema')
		expect(result.propertyName).toBe('mySchema')
	})

	it('replaces spaces with hyphens', () => {
		const result = names('hello world')
		expect(result.name).toBe('hello-world')
	})
})

describe('pluralize', () => {
	it('adds s to regular words', () => {
		expect(pluralize('cat')).toBe('cats')
		expect(pluralize('post')).toBe('posts')
	})

	it('handles irregular plurals', () => {
		expect(pluralize('person')).toBe('people')
		expect(pluralize('child')).toBe('children')
		expect(pluralize('history')).toBe('histories')
	})

	it('handles words ending in consonant+y (->ies)', () => {
		expect(pluralize('story')).toBe('stories')
		expect(pluralize('category')).toBe('categories')
	})

	it('handles words ending in s/x/z/ch/sh (->es)', () => {
		expect(pluralize('box')).toBe('boxes')
		expect(pluralize('church')).toBe('churches')
		expect(pluralize('bus')).toBe('buses')
	})

	it('handles media (uncountable)', () => {
		expect(pluralize('media')).toBe('media')
	})
})

describe('extractTextFromLexical', () => {
	const lexicalDoc = {
		root: {
			children: [
				{
					type: 'paragraph',
					children: [
						{ type: 'text', text: 'Hello' },
						{ type: 'text', text: 'world' },
					],
				},
			],
		},
	}

	it('extracts text from Lexical JSON object', () => {
		const result = extractTextFromLexical(lexicalDoc)
		expect(result).toContain('Hello')
		expect(result).toContain('world')
	})

	it('extracts text from Lexical JSON string', () => {
		const result = extractTextFromLexical(JSON.stringify(lexicalDoc))
		expect(result).toContain('Hello')
	})

	it('returns empty string for invalid JSON', () => {
		expect(extractTextFromLexical('not valid json {')).toBe('')
	})

	it('returns empty string for null/undefined', () => {
		expect(extractTextFromLexical(null)).toBe('')
		expect(extractTextFromLexical(undefined)).toBe('')
	})

	it('truncates text exceeding maxLength', () => {
		const longDoc = {
			root: {
				children: [
					{
						type: 'paragraph',
						children: [{ type: 'text', text: 'A'.repeat(200) }],
					},
				],
			},
		}
		const result = extractTextFromLexical(longDoc, 50)
		expect(result.length).toBeLessThanOrEqual(53) // 50 + '...'
		expect(result).toMatch(/\.\.\.$/)
	})

	it('extracts text from nested nodes', () => {
		const nested = {
			root: {
				children: [
					{
						type: 'quote',
						children: [
							{
								type: 'paragraph',
								children: [{ type: 'text', text: 'nested text' }],
							},
						],
					},
				],
			},
		}
		expect(extractTextFromLexical(nested)).toContain('nested text')
	})
})
