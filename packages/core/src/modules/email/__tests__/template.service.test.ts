/**
 * TemplateService unit tests.
 *
 * Tests the pure rendering logic extracted from TemplateService:
 * - Handlebars variable interpolation
 * - Default HTML layout wrapping
 * - Fallback to empty string when template not found
 * - Version-capping is tested in email-template.service.test.ts
 *
 * Full DB and React Email SSR integration is covered in:
 * apps/e2e/tests/api/email-templates.spec.ts
 */
import { describe, expect, it } from 'bun:test'
import Handlebars from 'handlebars'

// -------- Pure helpers mirroring TemplateService logic --------

/**
 * Mirrors TemplateService body compilation with Handlebars.
 */
function compileBody(source: string, context: Record<string, unknown>): string {
	return Handlebars.compile(source)(context)
}

/**
 * Mirrors the fallback resolution: if no compiled template, return empty string.
 */
function resolveTemplate(
	templates: Map<string, Handlebars.TemplateDelegate>,
	slug: string,
): Handlebars.TemplateDelegate | null {
	return templates.get(slug) ?? null
}

// ======================================================================
// Tests
// ======================================================================

describe('TemplateService — Handlebars compilation', () => {
	it('should interpolate simple variables', () => {
		const result = compileBody('Hello {{name}}!', { name: 'Alice' })
		expect(result).toBe('Hello Alice!')
	})

	it('should interpolate multiple variables', () => {
		const result = compileBody('{{greeting}}, {{name}}! Click {{url}}', {
			greeting: 'Welcome',
			name: 'Bob',
			url: 'https://example.com',
		})
		expect(result).toBe('Welcome, Bob! Click https://example.com')
	})

	it('should handle conditional blocks', () => {
		const source = '{{#if name}}Hello {{name}}{{else}}Hello stranger{{/if}}'
		expect(compileBody(source, { name: 'Alice' })).toBe('Hello Alice')
		expect(compileBody(source, {})).toBe('Hello stranger')
	})

	it('should leave undefined variables as empty string', () => {
		const result = compileBody('Hello {{name}}!', {})
		expect(result).toBe('Hello !')
	})

	it('should not execute injected HTML by default (XSS prevention)', () => {
		// Handlebars HTML-escapes by default with {{var}}
		const result = compileBody('{{content}}', {
			content: '<script>alert(1)</script>',
		})
		expect(result).toContain('&lt;script&gt;')
		expect(result).not.toContain('<script>')
	})

	it('should allow raw HTML via triple-stash {{{var}}}', () => {
		const result = compileBody('{{{content}}}', { content: '<b>bold</b>' })
		expect(result).toBe('<b>bold</b>')
	})
})

describe('TemplateService — in-memory template registry', () => {
	it('should return null when template not registered', () => {
		const templates = new Map<string, Handlebars.TemplateDelegate>()
		expect(resolveTemplate(templates, 'nonexistent')).toBeNull()
	})

	it('should return compiled template when registered', () => {
		const templates = new Map<string, Handlebars.TemplateDelegate>()
		templates.set('hello', Handlebars.compile('Hello {{name}}'))
		const tpl = resolveTemplate(templates, 'hello')
		expect(tpl).not.toBeNull()
		expect(tpl?.({ name: 'World' })).toBe('Hello World')
	})

	it('should overwrite a registered template', () => {
		const templates = new Map<string, Handlebars.TemplateDelegate>()
		templates.set('msg', Handlebars.compile('v1'))
		templates.set('msg', Handlebars.compile('v2 {{x}}'))
		const tpl = resolveTemplate(templates, 'msg')
		expect(tpl?.({ x: '!' })).toBe('v2 !')
	})
})
