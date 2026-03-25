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

import { getFieldMetadataForProperty } from '../field.factory'
import { Field } from '../index'

import type { EnumFieldOptions, SelectFieldOptions, TagsFieldOptions } from '~/types/field.types'
import { clearAdapterCache } from '~/utils/detect-adapter.util'

afterEach(() => {
  vi.mocked(clearAdapterCache)()
})

describe('Field.Select', () => {
  it('stores type select with options', () => {
    class SelA {
      @Field.Select({
        options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Published', value: 'published' },
        ],
      })
      status!: string
    }
    const f = getFieldMetadataForProperty(SelA, 'status')!
    expect(f.type).toBe('select')
    expect((f.options as SelectFieldOptions).options).toHaveLength(2)
  })

  it('stores default value', () => {
    class SelB {
      @Field.Select({ options: ['a', 'b'], default: 'a' })
      choice!: string
    }
    const f = getFieldMetadataForProperty(SelB, 'choice')!
    expect(f.options.default).toBe('a')
  })
})

describe('Field.Enum', () => {
  it('stores type enum with enum object', () => {
    enum Status {
      Draft = 'draft',
      Published = 'published',
    }
    class EnumA {
      @Field.Enum({ enum: Status })
      status!: Status
    }
    const f = getFieldMetadataForProperty(EnumA, 'status')!
    expect(f.type).toBe('enum')
    expect((f.options as EnumFieldOptions).enum).toBe(Status)
  })

  it('stores default value from enum', () => {
    enum Color {
      Red = 'red',
      Blue = 'blue',
    }
    class EnumB {
      @Field.Enum({ enum: Color, default: Color.Red })
      color!: Color
    }
    const f = getFieldMetadataForProperty(EnumB, 'color')!
    expect(f.options.default).toBe('red')
  })
})

describe('Field.Tags', () => {
  it('stores type tags', () => {
    class TagsA {
      @Field.Tags()
      tags!: string[]
    }
    const f = getFieldMetadataForProperty(TagsA, 'tags')!
    expect(f.type).toBe('tags')
  })

  it('stores suggestions option', () => {
    class TagsB {
      @Field.Tags({ suggestions: ['tech', 'news'] })
      categories!: string[]
    }
    const f = getFieldMetadataForProperty(TagsB, 'categories')!
    expect((f.options as TagsFieldOptions).suggestions).toEqual(['tech', 'news'])
  })
})
