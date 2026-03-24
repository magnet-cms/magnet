/**
 * useEmailTemplates unit tests.
 *
 * Tests pure logic extracted from useEmailTemplates:
 * - Query key structure (cache isolation between list/detail/versions)
 * - URL query string construction from filter options
 *
 * React Query / adapter integration is covered in
 * apps/e2e/tests/ui/email-templates.spec.ts.
 */
import { describe, expect, it } from 'vitest'
import { EMAIL_TEMPLATE_KEYS } from '../useEmailTemplates'
import type { EmailTemplateListFilters } from '../useEmailTemplates'

// -------- Pure helper mirroring URL construction logic --------

function buildListUrl(filters?: EmailTemplateListFilters): string {
	const params = new URLSearchParams()
	if (filters?.category) params.set('category', filters.category)
	if (filters?.locale) params.set('locale', filters.locale)
	if (filters?.search) params.set('search', filters.search)
	if (filters?.active !== undefined)
		params.set('active', String(filters.active))
	const query = params.toString()
	return `/email-templates${query ? `?${query}` : ''}`
}

// ======================================================================
// Tests
// ======================================================================

describe('EMAIL_TEMPLATE_KEYS — query key structure', () => {
	it('all key should be a stable root', () => {
		expect(EMAIL_TEMPLATE_KEYS.all).toEqual(['email-templates'])
	})

	it('list key should include filters for cache isolation', () => {
		const noFilter = EMAIL_TEMPLATE_KEYS.list()
		const withFilter = EMAIL_TEMPLATE_KEYS.list({ category: 'transactional' })
		expect(noFilter).not.toEqual(withFilter)
		expect(noFilter[0]).toBe('email-templates')
	})

	it('detail key should include id', () => {
		const key = EMAIL_TEMPLATE_KEYS.detail('abc-123')
		expect(key).toContain('abc-123')
		expect(key[0]).toBe('email-templates')
	})

	it('different ids produce different detail keys', () => {
		const key1 = EMAIL_TEMPLATE_KEYS.detail('id-1')
		const key2 = EMAIL_TEMPLATE_KEYS.detail('id-2')
		expect(key1).not.toEqual(key2)
	})

	it('versions key should include id', () => {
		const key = EMAIL_TEMPLATE_KEYS.versions('abc-123')
		expect(key).toContain('abc-123')
		expect(key).toContain('versions')
	})

	it('detail and versions keys for same id should be different', () => {
		const detail = EMAIL_TEMPLATE_KEYS.detail('id-1')
		const versions = EMAIL_TEMPLATE_KEYS.versions('id-1')
		expect(detail).not.toEqual(versions)
	})
})

describe('useEmailTemplateList — URL construction', () => {
	it('should return base URL when no filters provided', () => {
		expect(buildListUrl()).toBe('/email-templates')
	})

	it('should append category filter', () => {
		const url = buildListUrl({ category: 'transactional' })
		expect(url).toContain('category=transactional')
	})

	it('should append locale filter', () => {
		const url = buildListUrl({ locale: 'pt-BR' })
		expect(url).toContain('locale=pt-BR')
	})

	it('should append search filter', () => {
		const url = buildListUrl({ search: 'welcome' })
		expect(url).toContain('search=welcome')
	})

	it('should append active=true', () => {
		const url = buildListUrl({ active: true })
		expect(url).toContain('active=true')
	})

	it('should append active=false', () => {
		const url = buildListUrl({ active: false })
		expect(url).toContain('active=false')
	})

	it('should combine multiple filters', () => {
		const url = buildListUrl({
			category: 'transactional',
			locale: 'en',
			active: true,
		})
		expect(url).toContain('category=transactional')
		expect(url).toContain('locale=en')
		expect(url).toContain('active=true')
	})

	it('should not append query string when all filters are undefined', () => {
		const url = buildListUrl({ category: undefined, locale: undefined })
		expect(url).toBe('/email-templates')
	})
})
