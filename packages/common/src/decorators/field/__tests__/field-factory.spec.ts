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

import {
  createFieldDecorator,
  getFieldMetadata,
  getFieldMetadataForProperty,
} from '../field.factory'

import type { BooleanFieldOptions } from '~/types/field.types'
import { clearAdapterCache } from '~/utils/detect-adapter.util'

afterEach(() => {
  vi.mocked(clearAdapterCache)()
})

describe('createFieldDecorator', () => {
  it('creates a decorator that stores field metadata', () => {
    const MyField = createFieldDecorator<{ label?: string }>('text')

    class FactoryTestA {
      @MyField({ label: 'Custom' })
      field!: string
    }

    const f = getFieldMetadataForProperty(FactoryTestA, 'field')!
    expect(f.type).toBe('text')
    expect(f.options.label).toBe('Custom')
  })

  it('merges default options with user options', () => {
    const WithDefaults = createFieldDecorator<BooleanFieldOptions>('boolean', {
      style: 'switch',
    })

    class FactoryTestB {
      @WithDefaults({ required: true })
      active!: boolean
    }

    const f = getFieldMetadataForProperty(FactoryTestB, 'active')!
    expect((f.options as BooleanFieldOptions).style).toBe('switch')
    expect(f.options.required).toBe(true)
  })

  it('user options override defaults', () => {
    const OverrideField = createFieldDecorator<BooleanFieldOptions>('boolean', {
      style: 'switch',
    })

    class FactoryTestC {
      @OverrideField({ style: 'checkbox' })
      accepted!: boolean
    }

    const f = getFieldMetadataForProperty(FactoryTestC, 'accepted')!
    expect((f.options as BooleanFieldOptions).style).toBe('checkbox')
  })

  it('stores target class reference', () => {
    const SimpleField = createFieldDecorator('text')

    class FactoryTestD {
      @SimpleField()
      name!: string
    }

    const f = getFieldMetadataForProperty(FactoryTestD, 'name')!
    expect(f.target).toBe(FactoryTestD)
  })

  it('stores propertyKey as string', () => {
    const SimpleField2 = createFieldDecorator('number')

    class FactoryTestE {
      @SimpleField2()
      count!: number
    }

    const f = getFieldMetadataForProperty(FactoryTestE, 'count')!
    expect(f.propertyKey).toBe('count')
  })

  it('replaces existing metadata for same property (idempotent)', () => {
    const DynField = createFieldDecorator<{ required?: boolean }>('text')

    class FactoryTestF {
      @DynField({ required: true })
      title!: string
    }

    // Should only have 1 entry for 'title'
    const fields = getFieldMetadata(FactoryTestF)
    const titleFields = fields.filter((f) => f.propertyKey === 'title')
    expect(titleFields).toHaveLength(1)
  })
})
