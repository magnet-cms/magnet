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

import { SCHEMA_METADATA_KEY, SCHEMA_OPTIONS_METADATA_KEY } from '~/constants'
import { clearAdapterCache } from '~/utils/detect-adapter.util'
import { Schema, getSchemaOptions } from '../schema.decorator'

afterEach(() => {
	vi.mocked(clearAdapterCache)()
})

describe('@Schema decorator', () => {
	it('stores SCHEMA_METADATA_KEY = true on the class', () => {
		@Schema()
		class SchemaTestA {}
		expect(Reflect.getMetadata(SCHEMA_METADATA_KEY, SchemaTestA)).toBe(true)
	})

	it('stores default schema options when none provided', () => {
		@Schema()
		class SchemaTestB {}
		const opts = Reflect.getMetadata(SCHEMA_OPTIONS_METADATA_KEY, SchemaTestB)
		expect(opts.versioning).toBe(true)
		expect(opts.i18n).toBe(true)
		expect(opts.visible).toBe(true)
		expect(opts.autoSave).toBe(true)
		expect(opts.readOnly).toBe(false)
	})

	it('merges user options with defaults', () => {
		@Schema({ readOnly: true, autoSave: false })
		class SchemaTestC {}
		const opts = Reflect.getMetadata(SCHEMA_OPTIONS_METADATA_KEY, SchemaTestC)
		expect(opts.readOnly).toBe(true)
		expect(opts.autoSave).toBe(false)
		expect(opts.versioning).toBe(true)
		expect(opts.i18n).toBe(true)
	})

	it('stores custom indexes option', () => {
		@Schema({ indexes: [{ keys: { title: 1 }, unique: true }] })
		class SchemaTestD {}
		const opts = Reflect.getMetadata(SCHEMA_OPTIONS_METADATA_KEY, SchemaTestD)
		expect(opts.indexes).toHaveLength(1)
		expect(opts.indexes[0].unique).toBe(true)
	})
})

describe('getSchemaOptions', () => {
	it('returns defaults for class without options', () => {
		@Schema()
		class SchemaOptA {}
		const opts = getSchemaOptions(SchemaOptA)
		expect(opts.versioning).toBe(true)
		expect(opts.i18n).toBe(true)
		expect(opts.readOnly).toBe(false)
	})

	it('returns merged options when provided', () => {
		@Schema({ versioning: false })
		class SchemaOptB {}
		const opts = getSchemaOptions(SchemaOptB)
		expect(opts.versioning).toBe(false)
		expect(opts.i18n).toBe(true)
	})
})
