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

import { getFieldMetadata, getFieldMetadataForProperty } from '../field.factory'
import { Field } from '../index'

import type { BooleanFieldOptions, NumberFieldOptions } from '~/types/field.types'
import { clearAdapterCache } from '~/utils/detect-adapter.util'

afterEach(() => {
  vi.mocked(clearAdapterCache)()
})

describe('Field.Text', () => {
  it('stores type and propertyKey in FIELD_METADATA_KEY', () => {
    class PrimTextA {
      @Field.Text()
      title!: string
    }
    const fields = getFieldMetadata(PrimTextA)
    expect(fields).toHaveLength(1)
    const f = fields[0]!
    expect(f.type).toBe('text')
    expect(f.propertyKey).toBe('title')
  })

  it('stores required and unique options', () => {
    class PrimTextB {
      @Field.Text({ required: true, unique: true })
      name!: string
    }
    const f = getFieldMetadataForProperty(PrimTextB, 'name')!
    expect(f.options.required).toBe(true)
    expect(f.options.unique).toBe(true)
  })

  it('stores common options: label, tab, description, hidden, readonly', () => {
    class PrimTextC {
      @Field.Text({
        label: 'My Title',
        tab: 'SEO',
        description: 'A desc',
        hidden: true,
        readonly: true,
      })
      slug!: string
    }
    const f = getFieldMetadataForProperty(PrimTextC, 'slug')!
    expect(f.options.label).toBe('My Title')
    expect(f.options.tab).toBe('SEO')
    expect(f.options.description).toBe('A desc')
    expect(f.options.hidden).toBe(true)
    expect(f.options.readonly).toBe(true)
  })

  it('stores side option', () => {
    class PrimTextD {
      @Field.Text({ side: true })
      excerpt!: string
    }
    const f = getFieldMetadataForProperty(PrimTextD, 'excerpt')!
    expect(f.options.side).toBe(true)
  })
})

describe('Field.Number', () => {
  it('stores type number', () => {
    class PrimNumA {
      @Field.Number()
      count!: number
    }
    const f = getFieldMetadataForProperty(PrimNumA, 'count')!
    expect(f.type).toBe('number')
    expect(f.propertyKey).toBe('count')
  })

  it('stores min and max options', () => {
    class PrimNumB {
      @Field.Number({ min: 0, max: 100 })
      score!: number
    }
    const f = getFieldMetadataForProperty(PrimNumB, 'score')!
    const opts = f.options as NumberFieldOptions
    expect(opts.min).toBe(0)
    expect(opts.max).toBe(100)
  })
})

describe('Field.Boolean', () => {
  it('stores type boolean with default style:switch', () => {
    class PrimBoolA {
      @Field.Boolean()
      isActive!: boolean
    }
    const f = getFieldMetadataForProperty(PrimBoolA, 'isActive')!
    expect(f.type).toBe('boolean')
    expect((f.options as BooleanFieldOptions).style).toBe('switch')
  })

  it('overrides style to checkbox', () => {
    class PrimBoolB {
      @Field.Boolean({ style: 'checkbox' })
      accepted!: boolean
    }
    const f = getFieldMetadataForProperty(PrimBoolB, 'accepted')!
    expect((f.options as BooleanFieldOptions).style).toBe('checkbox')
  })

  it('stores default value', () => {
    class PrimBoolC {
      @Field.Boolean({ default: false })
      published!: boolean
    }
    const f = getFieldMetadataForProperty(PrimBoolC, 'published')!
    expect(f.options.default).toBe(false)
  })
})

describe('Field.Date', () => {
  it('stores type date', () => {
    class PrimDateA {
      @Field.Date()
      publishDate!: Date
    }
    const f = getFieldMetadataForProperty(PrimDateA, 'publishDate')!
    expect(f.type).toBe('date')
  })
})

describe('Field.DateTime', () => {
  it('stores type datetime', () => {
    class PrimDateTimeA {
      @Field.DateTime()
      scheduledAt!: Date
    }
    const f = getFieldMetadataForProperty(PrimDateTimeA, 'scheduledAt')!
    expect(f.type).toBe('datetime')
  })
})

describe('getFieldMetadata', () => {
  it('returns all fields on a class', () => {
    class MultiFieldA {
      @Field.Text()
      title!: string

      @Field.Number()
      count!: number

      @Field.Boolean()
      active!: boolean
    }
    const fields = getFieldMetadata(MultiFieldA)
    expect(fields).toHaveLength(3)
    const types = fields.map((f) => f.type)
    expect(types).toContain('text')
    expect(types).toContain('number')
    expect(types).toContain('boolean')
  })

  it('returns empty array for class with no fields', () => {
    class NoFieldsA {}
    const fields = getFieldMetadata(NoFieldsA)
    expect(fields).toEqual([])
  })
})

describe('getFieldMetadataForProperty', () => {
  it('returns undefined for missing property', () => {
    class MissingPropA {
      @Field.Text()
      title!: string
    }
    const f = getFieldMetadataForProperty(MissingPropA, 'nonexistent')
    expect(f).toBeUndefined()
  })
})
