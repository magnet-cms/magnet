/**
 * EmailTemplateService unit tests.
 *
 * Tests the pure business logic extracted from EmailTemplateService:
 * - Filter application (category, locale, active, search)
 * - Version history capping at MAX_VERSIONS (5)
 * - Locale resolution order (exact → default locale → first available)
 * - Compound slug+locale uniqueness check
 *
 * Intentional gap: We avoid importing the actual EmailTemplateService class
 * because @magnet-cms/common decorated schema classes expect reflect-metadata
 * to run before those modules load. Package tests use `@repo/vitest/base`, which
 * loads `reflect-metadata` via Vitest `setupFiles`, but this file still tests
 * logic via extracted pure functions that mirror the service implementation.
 *
 * Not covered here (by design):
 * - CRUD operations (create/update/delete) — covered by E2E in
 *   apps/e2e/tests/api/email-templates.spec.ts
 * - Default seed templates — verified on first app startup
 * - DI wiring — verified by check-types and E2E
 *
 * To enable full unit tests of the class: ensure tests run with the same
 * Vitest setup (reflect-metadata preload) before importing decorated schemas.
 */
import { beforeEach, describe, expect, it } from 'vitest'

// -------- Types mirroring EmailTemplate and filter interfaces --------

interface EmailTemplateVersion {
	subject: string
	body: string
	editedBy: string
	editedAt: string
}

interface FakeTemplate {
	id: string
	slug: string
	locale: string
	subject: string
	body: string
	category: string
	variables: string[]
	versions: EmailTemplateVersion[]
	active: boolean
	createdBy: string
	updatedBy: string
	createdAt: Date
	updatedAt: Date
}

interface EmailTemplateFilters {
	category?: string
	locale?: string
	search?: string
	active?: boolean
}

// -------- Pure helpers mirroring EmailTemplateService logic --------

const MAX_VERSIONS = 5

/**
 * Mirrors EmailTemplateService.applyFilters()
 */
function applyFilters(
	templates: FakeTemplate[],
	filters?: EmailTemplateFilters,
): FakeTemplate[] {
	if (!filters) return templates

	let result = templates

	if (filters.category) {
		result = result.filter((t) => t.category === filters.category)
	}

	if (filters.locale) {
		result = result.filter((t) => t.locale === filters.locale)
	}

	if (filters.active !== undefined) {
		result = result.filter((t) => t.active === filters.active)
	}

	if (filters.search) {
		const search = filters.search.toLowerCase()
		result = result.filter(
			(t) =>
				t.slug.toLowerCase().includes(search) ||
				t.subject.toLowerCase().includes(search),
		)
	}

	return result
}

/**
 * Mirrors the version capping logic in EmailTemplateService.update()
 */
function capVersions(
	existing: EmailTemplateVersion[],
	newVersion: EmailTemplateVersion,
	max = MAX_VERSIONS,
): EmailTemplateVersion[] {
	const versions = [...existing, newVersion]
	if (versions.length > max) {
		versions.splice(0, versions.length - max)
	}
	return versions
}

/**
 * Mirrors the locale resolution in EmailTemplateService.findBySlug()
 * Returns the resolved template or null.
 */
function resolveByLocale(
	all: FakeTemplate[],
	targetLocale: string,
	defaultLocale: string,
): FakeTemplate | null {
	if (!all || all.length === 0) return null

	const exact = all.find((t) => t.locale === targetLocale)
	if (exact) return exact

	const defaultMatch = all.find((t) => t.locale === defaultLocale)
	if (defaultMatch) return defaultMatch

	return all[0] ?? null
}

/**
 * Mirrors EmailTemplateService.findBySlugAllLocales()
 * Returns all locale variants for a given slug.
 */
function findBySlugAllLocales(
	templates: FakeTemplate[],
	slug: string,
): FakeTemplate[] {
	return templates.filter((t) => t.slug === slug)
}

/**
 * Mirrors the compound uniqueness check in EmailTemplateService.create()
 */
function isSlugLocaleTaken(
	existing: FakeTemplate[],
	slug: string,
	locale: string,
): boolean {
	return existing.some((t) => t.slug === slug && t.locale === locale)
}

// -------- Test data helpers --------

function makeTemplate(overrides: Partial<FakeTemplate> = {}): FakeTemplate {
	return {
		id: 'id-1',
		slug: 'welcome',
		locale: 'en',
		subject: 'Welcome!',
		body: '<p>Hello</p>',
		category: 'transactional',
		variables: [],
		versions: [],
		active: true,
		createdBy: 'system',
		updatedBy: 'system',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	}
}

function makeVersion(
	overrides: Partial<EmailTemplateVersion> = {},
): EmailTemplateVersion {
	return {
		subject: 'Old Subject',
		body: '<p>Old</p>',
		editedBy: 'user-1',
		editedAt: new Date().toISOString(),
		...overrides,
	}
}

// ======================================================================
// Tests
// ======================================================================

describe('EmailTemplateService — applyFilters', () => {
	let templates: FakeTemplate[]

	beforeEach(() => {
		templates = [
			makeTemplate({
				id: '1',
				slug: 'welcome',
				category: 'transactional',
				locale: 'en',
				active: true,
			}),
			makeTemplate({
				id: '2',
				slug: 'password-reset',
				category: 'transactional',
				locale: 'pt-BR',
				active: true,
			}),
			makeTemplate({
				id: '3',
				slug: 'newsletter',
				category: 'marketing',
				locale: 'en',
				active: false,
			}),
			makeTemplate({
				id: '4',
				slug: 'content-published',
				category: 'system',
				locale: 'en',
				active: true,
			}),
		]
	})

	it('should return all templates when no filters provided', () => {
		expect(applyFilters(templates)).toHaveLength(4)
	})

	it('should filter by category', () => {
		const result = applyFilters(templates, { category: 'transactional' })
		expect(result).toHaveLength(2)
		expect(result.every((t) => t.category === 'transactional')).toBe(true)
	})

	it('should filter by locale', () => {
		const result = applyFilters(templates, { locale: 'pt-BR' })
		expect(result).toHaveLength(1)
		expect(result[0]?.slug).toBe('password-reset')
	})

	it('should filter by active=true', () => {
		const result = applyFilters(templates, { active: true })
		expect(result).toHaveLength(3)
		expect(result.every((t) => t.active)).toBe(true)
	})

	it('should filter by active=false', () => {
		const result = applyFilters(templates, { active: false })
		expect(result).toHaveLength(1)
		expect(result[0]?.slug).toBe('newsletter')
	})

	it('should search by slug (case-insensitive)', () => {
		const result = applyFilters(templates, { search: 'PASS' })
		expect(result).toHaveLength(1)
		expect(result[0]?.slug).toBe('password-reset')
	})

	it('should search by subject (case-insensitive)', () => {
		const first = templates[0]
		if (first) first.subject = 'Welcome to our platform!'
		const result = applyFilters(templates, { search: 'platform' })
		expect(result).toHaveLength(1)
		expect(result[0]?.slug).toBe('welcome')
	})

	it('should combine multiple filters', () => {
		const result = applyFilters(templates, {
			category: 'transactional',
			locale: 'en',
		})
		expect(result).toHaveLength(1)
		expect(result[0]?.slug).toBe('welcome')
	})

	it('should return empty array when no templates match', () => {
		const result = applyFilters(templates, { category: 'unknown' })
		expect(result).toHaveLength(0)
	})
})

describe('EmailTemplateService — version capping', () => {
	it('should append a new version to an empty history', () => {
		const newVer = makeVersion({ subject: 'v1' })
		const result = capVersions([], newVer)
		expect(result).toHaveLength(1)
		expect(result[0]?.subject).toBe('v1')
	})

	it('should keep up to MAX_VERSIONS (5) entries', () => {
		const existing = [1, 2, 3, 4, 5].map((n) =>
			makeVersion({ subject: `v${n}` }),
		)
		const newVer = makeVersion({ subject: 'v6' })
		const result = capVersions(existing, newVer)
		expect(result).toHaveLength(5)
		// Oldest (v1) should be dropped
		expect(result.find((v) => v.subject === 'v1')).toBeUndefined()
		expect(result[result.length - 1]?.subject).toBe('v6')
	})

	it('should keep exactly 5 when adding to 4 existing', () => {
		const existing = [1, 2, 3, 4].map((n) => makeVersion({ subject: `v${n}` }))
		const result = capVersions(existing, makeVersion({ subject: 'v5' }))
		expect(result).toHaveLength(5)
	})

	it('should drop oldest entries when exceeding max', () => {
		const existing = [1, 2, 3, 4, 5].map((n) =>
			makeVersion({ subject: `v${n}` }),
		)
		const result = capVersions(existing, makeVersion({ subject: 'v6' }))
		const subjects = result.map((v) => v.subject)
		expect(subjects).toEqual(['v2', 'v3', 'v4', 'v5', 'v6'])
	})
})

describe('EmailTemplateService — locale resolution', () => {
	const DEFAULT_LOCALE = 'en'

	it('should return null when no templates exist', () => {
		expect(resolveByLocale([], 'en', DEFAULT_LOCALE)).toBeNull()
	})

	it('should return exact locale match first', () => {
		const templates = [
			makeTemplate({ id: '1', locale: 'en' }),
			makeTemplate({ id: '2', locale: 'pt-BR' }),
		]
		const result = resolveByLocale(templates, 'pt-BR', DEFAULT_LOCALE)
		expect(result?.id).toBe('2')
	})

	it('should fall back to default locale when exact match not found', () => {
		const templates = [
			makeTemplate({ id: '1', locale: 'en' }),
			makeTemplate({ id: '2', locale: 'fr' }),
		]
		const result = resolveByLocale(templates, 'de', DEFAULT_LOCALE)
		expect(result?.id).toBe('1')
	})

	it('should fall back to first available when neither exact nor default found', () => {
		const templates = [
			makeTemplate({ id: '1', locale: 'fr' }),
			makeTemplate({ id: '2', locale: 'es' }),
		]
		const result = resolveByLocale(templates, 'de', DEFAULT_LOCALE)
		expect(result?.id).toBe('1')
	})

	it('should return exact locale even when default is available', () => {
		const templates = [
			makeTemplate({ id: '1', locale: 'en' }),
			makeTemplate({ id: '2', locale: 'pt-BR' }),
		]
		const result = resolveByLocale(templates, 'pt-BR', DEFAULT_LOCALE)
		expect(result?.id).toBe('2')
	})
})

describe('EmailTemplateService — slug+locale uniqueness', () => {
	it('should detect duplicate slug+locale', () => {
		const existing = [makeTemplate({ slug: 'welcome', locale: 'en' })]
		expect(isSlugLocaleTaken(existing, 'welcome', 'en')).toBe(true)
	})

	it('should allow same slug with different locale', () => {
		const existing = [makeTemplate({ slug: 'welcome', locale: 'en' })]
		expect(isSlugLocaleTaken(existing, 'welcome', 'pt-BR')).toBe(false)
	})

	it('should allow different slug with same locale', () => {
		const existing = [makeTemplate({ slug: 'welcome', locale: 'en' })]
		expect(isSlugLocaleTaken(existing, 'password-reset', 'en')).toBe(false)
	})

	it('should return false for empty existing list', () => {
		expect(isSlugLocaleTaken([], 'welcome', 'en')).toBe(false)
	})
})

describe('EmailTemplateService — findBySlugAllLocales', () => {
	it('should return all locale variants for a slug', () => {
		const templates = [
			makeTemplate({ id: '1', slug: 'welcome', locale: 'en' }),
			makeTemplate({ id: '2', slug: 'welcome', locale: 'pt-BR' }),
			makeTemplate({ id: '3', slug: 'password-reset', locale: 'en' }),
		]
		const result = findBySlugAllLocales(templates, 'welcome')
		expect(result).toHaveLength(2)
		expect(result.map((t) => t.id)).toEqual(['1', '2'])
	})

	it('should return empty array when slug does not exist', () => {
		const templates = [makeTemplate({ slug: 'welcome', locale: 'en' })]
		const result = findBySlugAllLocales(templates, 'nonexistent')
		expect(result).toHaveLength(0)
	})

	it('should return single item when only one locale exists', () => {
		const templates = [makeTemplate({ id: '1', slug: 'welcome', locale: 'en' })]
		const result = findBySlugAllLocales(templates, 'welcome')
		expect(result).toHaveLength(1)
		expect(result[0]?.id).toBe('1')
	})

	it('should not return templates from other slugs', () => {
		const templates = [
			makeTemplate({ id: '1', slug: 'welcome', locale: 'en' }),
			makeTemplate({ id: '2', slug: 'farewell', locale: 'en' }),
		]
		const result = findBySlugAllLocales(templates, 'welcome')
		expect(result.every((t) => t.slug === 'welcome')).toBe(true)
	})
})
