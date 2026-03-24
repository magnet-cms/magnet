import 'reflect-metadata'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/utils/detect-adapter.util', () => ({
	detectDatabaseAdapter: () => 'mongoose',
	setDatabaseAdapter: vi.fn(),
	clearAdapterCache: vi.fn(),
}))

vi.mock('~/utils/database-adapter-module.util', () => ({
	requireDatabaseAdapterModule: () => ({
		Prop: () => () => {},
		Schema: () => () => {},
	}),
	getDatabaseAdapterResolutionRoots: () => [],
}))

import type {
	ArrayFieldOptions,
	BlocksFieldOptions,
	RelationshipFieldOptions,
} from '~/types/field.types'
import { clearAdapterCache } from '~/utils/detect-adapter.util'
import { getFieldMetadataForProperty } from '../field.factory'
import { Field } from '../index'

afterEach(() => {
	vi.mocked(clearAdapterCache)()
})

describe('Field.Object', () => {
	it('stores type object', () => {
		class CompObjA {
			@Field.Object()
			meta!: Record<string, unknown>
		}
		const f = getFieldMetadataForProperty(CompObjA, 'meta')!
		expect(f.type).toBe('object')
	})
})

describe('Field.Array', () => {
	it('stores type array with of option', () => {
		class CompArrA {
			@Field.Array({ of: { type: 'text' } })
			items!: string[]
		}
		const f = getFieldMetadataForProperty(CompArrA, 'items')!
		expect(f.type).toBe('array')
		expect((f.options as ArrayFieldOptions).of).toEqual({ type: 'text' })
	})
})

describe('Field.Blocks', () => {
	it('stores type blocks', () => {
		class CompBlockA {
			@Field.Blocks()
			content!: unknown[]
		}
		const f = getFieldMetadataForProperty(CompBlockA, 'content')!
		expect(f.type).toBe('blocks')
	})

	it('stores types option', () => {
		class CompBlockB {
			@Field.Blocks({ types: ['paragraph', 'image'] })
			sections!: unknown[]
		}
		const f = getFieldMetadataForProperty(CompBlockB, 'sections')!
		expect((f.options as BlocksFieldOptions).types).toEqual([
			'paragraph',
			'image',
		])
	})
})

describe('Field.Relationship', () => {
	it('stores type relationship with ref', () => {
		class CompRelA {
			@Field.Relationship({ ref: 'users' })
			author!: string
		}
		const f = getFieldMetadataForProperty(CompRelA, 'author')!
		expect(f.type).toBe('relationship')
		expect((f.options as RelationshipFieldOptions).ref).toBe('users')
	})

	it('stores multiple:true option', () => {
		class CompRelB {
			@Field.Relationship({ ref: 'categories', multiple: true })
			categories!: string[]
		}
		const f = getFieldMetadataForProperty(CompRelB, 'categories')!
		expect((f.options as RelationshipFieldOptions).multiple).toBe(true)
	})

	it('stores multiple:false option (default)', () => {
		class CompRelC {
			@Field.Relationship({ ref: 'tags', multiple: false })
			primaryTag!: string
		}
		const f = getFieldMetadataForProperty(CompRelC, 'primaryTag')!
		expect((f.options as RelationshipFieldOptions).multiple).toBe(false)
	})
})
