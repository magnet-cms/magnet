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

import type {
  ColorFieldOptions,
  EmailFieldOptions,
  PhoneFieldOptions,
  SlugFieldOptions,
} from '~/types/field.types'
import { clearAdapterCache } from '~/utils/detect-adapter.util'

afterEach(() => {
  vi.mocked(clearAdapterCache)()
})

describe('Field.Slug', () => {
  it('stores type slug', () => {
    class SpecSlugA {
      @Field.Slug()
      slug!: string
    }
    const f = getFieldMetadataForProperty(SpecSlugA, 'slug')!
    expect(f.type).toBe('slug')
  })

  it('stores from option', () => {
    class SpecSlugB {
      @Field.Slug({ from: 'title' })
      slug!: string
    }
    const f = getFieldMetadataForProperty(SpecSlugB, 'slug')!
    expect((f.options as SlugFieldOptions).from).toBe('title')
  })
})

describe('Field.Email', () => {
  it('stores type email with default pattern', () => {
    class SpecEmailA {
      @Field.Email()
      email!: string
    }
    const f = getFieldMetadataForProperty(SpecEmailA, 'email')!
    expect(f.type).toBe('email')
    expect((f.options as EmailFieldOptions).pattern).toBe('^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$')
  })

  it('overrides pattern', () => {
    class SpecEmailB {
      @Field.Email({ pattern: '^.+@company\\.com$' })
      workEmail!: string
    }
    const f = getFieldMetadataForProperty(SpecEmailB, 'workEmail')!
    expect((f.options as EmailFieldOptions).pattern).toBe('^.+@company\\.com$')
  })
})

describe('Field.URL', () => {
  it('stores type url', () => {
    class SpecUrlA {
      @Field.URL()
      website!: string
    }
    const f = getFieldMetadataForProperty(SpecUrlA, 'website')!
    expect(f.type).toBe('url')
  })
})

describe('Field.Phone', () => {
  it('stores type phone', () => {
    class SpecPhoneA {
      @Field.Phone()
      phone!: string
    }
    const f = getFieldMetadataForProperty(SpecPhoneA, 'phone')!
    expect(f.type).toBe('phone')
  })

  it('stores defaultCountry option', () => {
    class SpecPhoneB {
      @Field.Phone({ defaultCountry: 'US' })
      mobile!: string
    }
    const f = getFieldMetadataForProperty(SpecPhoneB, 'mobile')!
    expect((f.options as PhoneFieldOptions).defaultCountry).toBe('US')
  })
})

describe('Field.Address', () => {
  it('stores type address', () => {
    class SpecAddrA {
      @Field.Address()
      address!: string
    }
    const f = getFieldMetadataForProperty(SpecAddrA, 'address')!
    expect(f.type).toBe('address')
  })
})

describe('Field.Color', () => {
  it('stores type color with default format:hex', () => {
    class SpecColorA {
      @Field.Color()
      brandColor!: string
    }
    const f = getFieldMetadataForProperty(SpecColorA, 'brandColor')!
    expect(f.type).toBe('color')
    expect((f.options as ColorFieldOptions).format).toBe('hex')
  })

  it('overrides format', () => {
    class SpecColorB {
      @Field.Color({ format: 'rgb' })
      accentColor!: string
    }
    const f = getFieldMetadataForProperty(SpecColorB, 'accentColor')!
    expect((f.options as ColorFieldOptions).format).toBe('rgb')
  })
})
