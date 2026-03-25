import { describe, expect, it } from 'vitest'

import { isDateField, mapDocumentFields, mapQueryFields } from '../field-mapping'

describe('mapDocumentFields', () => {
  it('returns empty object for null input', () => {
    expect(mapDocumentFields(null)).toEqual({})
  })

  it('returns empty object for undefined input', () => {
    expect(mapDocumentFields(undefined)).toEqual({})
  })

  it('converts snake_case keys to camelCase', () => {
    const result = mapDocumentFields({ user_id: '1', created_at: '2024-01-01' })
    expect(result).toHaveProperty('userId', '1')
  })

  it('converts string dates to Date objects for *_at fields', () => {
    const dateStr = '2024-01-01T00:00:00.000Z'
    const result = mapDocumentFields({ created_at: dateStr })
    expect(result.createdAt).toBeInstanceOf(Date)
  })

  it('preserves Date objects unchanged', () => {
    const date = new Date('2024-01-01')
    const result = mapDocumentFields({ created_at: date })
    expect(result.createdAt).toBeInstanceOf(Date)
    expect((result.createdAt as Date).getTime()).toBe(date.getTime())
  })

  it('applies custom field mappings', () => {
    const result = mapDocumentFields(
      { _id: 'abc123', name: 'test' },
      { fieldMappings: { _id: 'id' } },
    )
    expect(result).toHaveProperty('id', 'abc123')
  })

  it('uses mapId for ID transformation', () => {
    const result = mapDocumentFields(
      { _id: 'abc123', name: 'test' },
      {
        mapId: (doc) => ({ id: String(doc._id), rest: { name: doc.name } }),
      },
    )
    expect(result).toHaveProperty('id', 'abc123')
    expect(result).toHaveProperty('name', 'test')
  })

  it('applies explicit dateFields option', () => {
    const dateStr = '2024-06-15T12:00:00.000Z'
    const result = mapDocumentFields({ published: dateStr }, { dateFields: ['published'] })
    expect(result.published).toBeInstanceOf(Date)
  })
})

describe('mapQueryFields', () => {
  it('returns empty object for empty query', () => {
    expect(mapQueryFields({})).toEqual({})
  })

  it('passes field names through unchanged by default', () => {
    const result = mapQueryFields({ name: 'alice' })
    expect(result).toHaveProperty('name', 'alice')
  })

  it('applies mapId for id field', () => {
    const result = mapQueryFields({ id: 'abc123' }, { mapId: (id) => ({ _id: id }) })
    expect(result).toHaveProperty('_id', 'abc123')
    expect(result).not.toHaveProperty('id')
  })

  it('applies custom field mappings', () => {
    const result = mapQueryFields({ userId: 'u1' }, { fieldMappings: { userId: 'user_id' } })
    expect(result).toHaveProperty('user_id', 'u1')
  })
})

describe('isDateField', () => {
  it('returns true for fields ending with At', () => {
    expect(isDateField('createdAt')).toBe(true)
    expect(isDateField('updatedAt')).toBe(true)
    expect(isDateField('deletedAt')).toBe(true)
  })

  it('returns true for fields ending with _at', () => {
    expect(isDateField('created_at')).toBe(true)
    expect(isDateField('updated_at')).toBe(true)
  })

  it('returns false for non-date fields', () => {
    expect(isDateField('name')).toBe(false)
    expect(isDateField('userId')).toBe(false)
    expect(isDateField('email')).toBe(false)
  })
})
