import { describe, expect, it } from 'vitest'

import { mapFieldTypeToUI } from '../field.ui-mapper'

import type {
  ArrayFieldOptions,
  BooleanFieldOptions,
  EnumFieldOptions,
  RelationshipFieldOptions,
  SelectFieldOptions,
  TagsFieldOptions,
} from '~/types/field.types'

describe('mapFieldTypeToUI', () => {
  it('maps text → type:text', () => {
    expect(mapFieldTypeToUI('text', {}).type).toBe('text')
  })

  it('maps number → type:number', () => {
    expect(mapFieldTypeToUI('number', {}).type).toBe('number')
  })

  it('maps boolean → type:switch (default)', () => {
    expect(mapFieldTypeToUI('boolean', {}).type).toBe('switch')
  })

  it('maps boolean with style:checkbox → type:checkbox', () => {
    expect(mapFieldTypeToUI('boolean', { style: 'checkbox' } as BooleanFieldOptions).type).toBe(
      'checkbox',
    )
  })

  it('maps date → type:date', () => {
    expect(mapFieldTypeToUI('date', {}).type).toBe('date')
  })

  it('maps datetime → type:date', () => {
    expect(mapFieldTypeToUI('datetime', {}).type).toBe('date')
  })

  it('maps richtext → type:richText', () => {
    expect(mapFieldTypeToUI('richtext', {}).type).toBe('richText')
  })

  it('maps markdown → type:textarea', () => {
    expect(mapFieldTypeToUI('markdown', {}).type).toBe('textarea')
  })

  it('maps code → type:code', () => {
    expect(mapFieldTypeToUI('code', {}).type).toBe('code')
  })

  it('maps json → type:json', () => {
    expect(mapFieldTypeToUI('json', {}).type).toBe('json')
  })

  it('maps textarea → type:textarea', () => {
    expect(mapFieldTypeToUI('textarea', {}).type).toBe('textarea')
  })

  it('maps select → type:select with converted options', () => {
    const result = mapFieldTypeToUI('select', {
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    } as SelectFieldOptions)
    expect(result.type).toBe('select')
    const opts = (result as { options?: { key: string; value: string }[] }).options!
    expect(opts).toHaveLength(2)
    expect(opts[0]).toEqual({ key: 'draft', value: 'Draft' })
    expect(opts[1]).toEqual({ key: 'published', value: 'Published' })
  })

  it('maps select with multiple → type:multiSelect', () => {
    const result = mapFieldTypeToUI('select', {
      options: ['a', 'b'],
      multiple: true,
    } as SelectFieldOptions)
    expect(result.type).toBe('multiSelect')
  })

  it('maps enum → type:select with converted enum values', () => {
    enum Status {
      Draft = 'draft',
      Published = 'published',
    }
    const result = mapFieldTypeToUI('enum', {
      enum: Status,
    } as EnumFieldOptions)
    expect(result.type).toBe('select')
    const opts = (result as { options?: { key: string; value: string }[] }).options!
    expect(opts.find((o) => o.key === 'draft')).toBeDefined()
    expect(opts.find((o) => o.key === 'published')).toBeDefined()
  })

  it('maps enum with multiple → type:multiSelect', () => {
    enum Color {
      Red = 'red',
    }
    const result = mapFieldTypeToUI('enum', {
      enum: Color,
      multiple: true,
    } as EnumFieldOptions)
    expect(result.type).toBe('multiSelect')
  })

  it('maps tags → type:multiSelect with suggestions as options', () => {
    const result = mapFieldTypeToUI('tags', {
      suggestions: ['tech', 'news'],
    } as TagsFieldOptions)
    expect(result.type).toBe('multiSelect')
    const opts = (result as { options?: { key: string; value: string }[] }).options!
    expect(opts).toEqual([
      { key: 'tech', value: 'tech' },
      { key: 'news', value: 'news' },
    ])
  })

  it('maps tags without suggestions → multiSelect with empty options', () => {
    const result = mapFieldTypeToUI('tags', {})
    expect(result.type).toBe('multiSelect')
    const opts = (result as { options?: unknown[] }).options!
    expect(opts).toEqual([])
  })

  it('maps image → type:upload', () => {
    expect(mapFieldTypeToUI('image', {}).type).toBe('upload')
  })

  it('maps file → type:fileUpload', () => {
    expect(mapFieldTypeToUI('file', {}).type).toBe('fileUpload')
  })

  it('maps gallery → type:upload', () => {
    expect(mapFieldTypeToUI('gallery', {}).type).toBe('upload')
  })

  it('maps slug → type:text', () => {
    expect(mapFieldTypeToUI('slug', {}).type).toBe('text')
  })

  it('maps email → type:email', () => {
    expect(mapFieldTypeToUI('email', {}).type).toBe('email')
  })

  it('maps url → type:text', () => {
    expect(mapFieldTypeToUI('url', {}).type).toBe('text')
  })

  it('maps phone → type:phone', () => {
    expect(mapFieldTypeToUI('phone', {}).type).toBe('phone')
  })

  it('maps address → type:text', () => {
    expect(mapFieldTypeToUI('address', {}).type).toBe('text')
  })

  it('maps color → type:text', () => {
    expect(mapFieldTypeToUI('color', {}).type).toBe('text')
  })

  it('maps object → type:json', () => {
    expect(mapFieldTypeToUI('object', {}).type).toBe('json')
  })

  it('maps array → type:array', () => {
    expect(mapFieldTypeToUI('array', { of: { type: 'text' } } as ArrayFieldOptions).type).toBe(
      'array',
    )
  })

  it('maps blocks → type:blocks', () => {
    expect(mapFieldTypeToUI('blocks', {}).type).toBe('blocks')
  })

  it('maps relationship → type:relationship', () => {
    expect(
      mapFieldTypeToUI('relationship', {
        ref: 'users',
      } as RelationshipFieldOptions).type,
    ).toBe('relationship')
  })

  it('passes through label and description', () => {
    const result = mapFieldTypeToUI('text', {
      label: 'My Label',
      description: 'A desc',
    })
    expect(result.label).toBe('My Label')
    expect(result.description).toBe('A desc')
  })

  it('defaults tab to General when not specified', () => {
    const result = mapFieldTypeToUI('text', {}) as { tab?: string }
    expect(result.tab).toBe('General')
  })

  it('uses provided tab', () => {
    const result = mapFieldTypeToUI('text', { tab: 'SEO' }) as { tab?: string }
    expect(result.tab).toBe('SEO')
  })

  it('returns side:true when side option set', () => {
    const result = mapFieldTypeToUI('text', { side: true }) as {
      side?: boolean
      tab?: string
    }
    expect(result.side).toBe(true)
    expect(result.tab).toBeUndefined()
  })
})
