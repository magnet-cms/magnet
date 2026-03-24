import { describe, expect, it } from 'vitest'
import type {
	ArrayFieldOptions,
	EnumFieldOptions,
	RelationshipFieldOptions,
	SelectFieldOptions,
} from '~/types/field.types'
import { mapFieldTypeToProp } from '../field.prop-mapper'

describe('mapFieldTypeToProp', () => {
	it('maps text → String', () => {
		expect(mapFieldTypeToProp('text', {}).type).toBe(String)
	})

	it('maps email → String', () => {
		expect(mapFieldTypeToProp('email', {}).type).toBe(String)
	})

	it('maps url → String', () => {
		expect(mapFieldTypeToProp('url', {}).type).toBe(String)
	})

	it('maps phone → String', () => {
		expect(mapFieldTypeToProp('phone', {}).type).toBe(String)
	})

	it('maps address → String', () => {
		expect(mapFieldTypeToProp('address', {}).type).toBe(String)
	})

	it('maps color → String', () => {
		expect(mapFieldTypeToProp('color', {}).type).toBe(String)
	})

	it('maps slug → String', () => {
		expect(mapFieldTypeToProp('slug', {}).type).toBe(String)
	})

	it('maps textarea → String', () => {
		expect(mapFieldTypeToProp('textarea', {}).type).toBe(String)
	})

	it('maps markdown → String', () => {
		expect(mapFieldTypeToProp('markdown', {}).type).toBe(String)
	})

	it('maps code → String', () => {
		expect(mapFieldTypeToProp('code', {}).type).toBe(String)
	})

	it('maps richtext → String', () => {
		expect(mapFieldTypeToProp('richtext', {}).type).toBe(String)
	})

	it('maps number → Number', () => {
		expect(mapFieldTypeToProp('number', {}).type).toBe(Number)
	})

	it('maps boolean → Boolean', () => {
		expect(mapFieldTypeToProp('boolean', {}).type).toBe(Boolean)
	})

	it('maps date → Date', () => {
		expect(mapFieldTypeToProp('date', {}).type).toBe(Date)
	})

	it('maps datetime → Date', () => {
		expect(mapFieldTypeToProp('datetime', {}).type).toBe(Date)
	})

	it('maps json → Object', () => {
		expect(mapFieldTypeToProp('json', {}).type).toBe(Object)
	})

	it('maps object → Object', () => {
		expect(mapFieldTypeToProp('object', {}).type).toBe(Object)
	})

	it('maps select → String', () => {
		expect(
			mapFieldTypeToProp('select', { options: [] } as SelectFieldOptions).type,
		).toBe(String)
	})

	it('maps enum → String', () => {
		expect(
			mapFieldTypeToProp('enum', { enum: {} } as EnumFieldOptions).type,
		).toBe(String)
	})

	it('maps tags → [String]', () => {
		expect(mapFieldTypeToProp('tags', {}).type).toEqual([String])
	})

	it('maps image → String', () => {
		expect(mapFieldTypeToProp('image', {}).type).toBe(String)
	})

	it('maps file → String', () => {
		expect(mapFieldTypeToProp('file', {}).type).toBe(String)
	})

	it('maps gallery → [String]', () => {
		expect(mapFieldTypeToProp('gallery', {}).type).toEqual([String])
	})

	it('maps array → Array', () => {
		expect(
			mapFieldTypeToProp('array', { of: { type: 'text' } } as ArrayFieldOptions)
				.type,
		).toBe(Array)
	})

	it('maps blocks → Array', () => {
		expect(mapFieldTypeToProp('blocks', {}).type).toBe(Array)
	})

	it('maps relationship single → String with ref', () => {
		const result = mapFieldTypeToProp('relationship', {
			ref: 'users',
			multiple: false,
		} as RelationshipFieldOptions)
		expect(result.type).toBe(String)
		expect(result.ref).toBe('users')
	})

	it('maps relationship multiple → [String] with ref', () => {
		const result = mapFieldTypeToProp('relationship', {
			ref: 'tags',
			multiple: true,
		} as RelationshipFieldOptions)
		expect(result.type).toEqual([String])
		expect(result.ref).toBe('tags')
	})

	it('passes through required, unique, hidden, readonly, description', () => {
		const result = mapFieldTypeToProp('text', {
			required: true,
			unique: true,
			hidden: true,
			readonly: true,
			description: 'A field',
		})
		expect(result.required).toBe(true)
		expect(result.unique).toBe(true)
		expect(result.hidden).toBe(true)
		expect(result.readonly).toBe(true)
		expect(result.description).toBe('A field')
	})

	it('passes through default value', () => {
		const result = mapFieldTypeToProp('text', { default: 'hello' })
		expect(result.default).toBe('hello')
	})

	it('omits undefined values from result', () => {
		const result = mapFieldTypeToProp('text', {})
		expect(Object.keys(result)).not.toContain('required')
		expect(Object.keys(result)).not.toContain('unique')
	})
})
