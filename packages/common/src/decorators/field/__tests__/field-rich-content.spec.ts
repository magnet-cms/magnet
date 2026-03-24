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
	CodeFieldOptions,
	MarkdownFieldOptions,
	RichTextFieldOptions,
	TextareaFieldOptions,
} from '~/types/field.types'
import { clearAdapterCache } from '~/utils/detect-adapter.util'
import { getFieldMetadataForProperty } from '../field.factory'
import { Field } from '../index'

afterEach(() => {
	vi.mocked(clearAdapterCache)()
})

describe('Field.RichText', () => {
	it('stores type richtext with default toolbar:standard', () => {
		class RichA {
			@Field.RichText()
			content!: string
		}
		const f = getFieldMetadataForProperty(RichA, 'content')!
		expect(f.type).toBe('richtext')
		expect((f.options as RichTextFieldOptions).toolbar).toBe('standard')
	})

	it('overrides toolbar to full', () => {
		class RichB {
			@Field.RichText({ toolbar: 'full' })
			body!: string
		}
		const f = getFieldMetadataForProperty(RichB, 'body')!
		expect((f.options as RichTextFieldOptions).toolbar).toBe('full')
	})
})

describe('Field.Markdown', () => {
	it('stores type markdown with default preview:true', () => {
		class MdA {
			@Field.Markdown()
			description!: string
		}
		const f = getFieldMetadataForProperty(MdA, 'description')!
		expect(f.type).toBe('markdown')
		expect((f.options as MarkdownFieldOptions).preview).toBe(true)
	})

	it('overrides preview to false', () => {
		class MdB {
			@Field.Markdown({ preview: false })
			notes!: string
		}
		const f = getFieldMetadataForProperty(MdB, 'notes')!
		expect((f.options as MarkdownFieldOptions).preview).toBe(false)
	})
})

describe('Field.Code', () => {
	it('stores type code', () => {
		class CodeA {
			@Field.Code()
			snippet!: string
		}
		const f = getFieldMetadataForProperty(CodeA, 'snippet')!
		expect(f.type).toBe('code')
	})

	it('stores language option', () => {
		class CodeB {
			@Field.Code({ language: 'typescript' })
			example!: string
		}
		const f = getFieldMetadataForProperty(CodeB, 'example')!
		expect((f.options as CodeFieldOptions).language).toBe('typescript')
	})
})

describe('Field.JSON', () => {
	it('stores type json', () => {
		class JsonA {
			@Field.JSON()
			metadata!: Record<string, unknown>
		}
		const f = getFieldMetadataForProperty(JsonA, 'metadata')!
		expect(f.type).toBe('json')
	})
})

describe('Field.Textarea', () => {
	it('stores type textarea', () => {
		class TextareaA {
			@Field.Textarea()
			summary!: string
		}
		const f = getFieldMetadataForProperty(TextareaA, 'summary')!
		expect(f.type).toBe('textarea')
	})

	it('stores rows option', () => {
		class TextareaB {
			@Field.Textarea({ rows: 5 })
			bio!: string
		}
		const f = getFieldMetadataForProperty(TextareaB, 'bio')!
		expect((f.options as TextareaFieldOptions).rows).toBe(5)
	})
})
