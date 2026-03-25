import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DiscoveryService } from '../../../modules/discovery/discovery.service'
import { sanitizeRichTextFields } from '../utils/sanitize-richtext'

function makeDiscovery(
	schemaResult: ReturnType<DiscoveryService['getDiscoveredSchema']>,
): DiscoveryService {
	return {
		getDiscoveredSchema: vi.fn().mockReturnValue(schemaResult),
	} as unknown as DiscoveryService
}

const RICHTEXT_SCHEMA = {
	name: 'article',
	properties: [
		{
			name: 'title',
			type: 'text',
			isArray: false,
			unique: false,
			required: false,
			validations: [],
		},
		{
			name: 'body',
			type: 'richtext',
			isArray: false,
			unique: false,
			required: false,
			validations: [],
		},
		{
			name: 'summary',
			type: 'richtext',
			isArray: false,
			unique: false,
			required: false,
			validations: [],
		},
	],
}

describe('sanitizeRichTextFields', () => {
	let discovery: DiscoveryService

	beforeEach(() => {
		discovery = makeDiscovery(RICHTEXT_SCHEMA)
	})

	it('strips script tags from richtext fields', () => {
		const data = {
			title: 'Hello',
			body: '<p>Hello</p><script>alert("xss")</script>',
		}
		const result = sanitizeRichTextFields('article', data, discovery)
		expect(result.body).not.toContain('<script>')
		expect(result.body).not.toContain('alert')
		expect(result.body).toContain('<p>Hello</p>')
	})

	it('preserves safe HTML in richtext fields', () => {
		const data = {
			body: '<p>Hello <strong>world</strong></p>',
		}
		const result = sanitizeRichTextFields('article', data, discovery)
		expect(result.body).toBe('<p>Hello <strong>world</strong></p>')
	})

	it('strips javascript: href from anchor tags', () => {
		const data = {
			body: '<a href="javascript:alert(1)">click</a>',
		}
		const result = sanitizeRichTextFields('article', data, discovery)
		expect(result.body).not.toContain('javascript:')
	})

	it('does not modify non-richtext fields', () => {
		const data = {
			title: '<script>evil()</script>raw title',
			body: '<p>ok</p>',
		}
		const result = sanitizeRichTextFields('article', data, discovery)
		// title is a text field — not sanitized
		expect(result.title).toBe('<script>evil()</script>raw title')
	})

	it('returns data unchanged when schema has error', () => {
		const errorDiscovery = makeDiscovery({ error: 'Schema not found' })
		const data = {
			body: '<script>xss()</script><p>hello</p>',
		}
		const result = sanitizeRichTextFields('nonexistent', data, errorDiscovery)
		expect(result.body).toBe(data.body)
	})

	it('handles multiple richtext fields independently', () => {
		const data = {
			body: '<p>body</p><script>bad()</script>',
			summary: '<em>summary</em><iframe src="evil.com"></iframe>',
		}
		const result = sanitizeRichTextFields('article', data, discovery)
		expect(result.body).not.toContain('<script>')
		expect(result.body).toContain('<p>body</p>')
		expect(result.summary).not.toContain('<iframe>')
		expect(result.summary).toContain('<em>summary</em>')
	})

	it('handles non-string richtext field values gracefully', () => {
		const data = { body: 42 }
		expect(() =>
			sanitizeRichTextFields(
				'article',
				data as Record<string, unknown>,
				discovery,
			),
		).not.toThrow()
	})
})
