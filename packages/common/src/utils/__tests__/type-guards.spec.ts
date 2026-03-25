import { describe, expect, it } from 'vitest'

import {
  assert,
  assertDefined,
  getDocumentId,
  hasMethod,
  hasProperties,
  hasProperty,
  hasSetLocale,
  hasToString,
  isArray,
  isBoolean,
  isCastError,
  isDocument,
  isDuplicateKeyError,
  isFunction,
  isNumber,
  isObject,
  isPostgresUniqueError,
  isString,
  isStringArray,
  isStringRecord,
  isValidationError,
  isVersionDocument,
} from '../type-guards'

describe('isObject', () => {
  it('returns true for plain objects', () => {
    expect(isObject({})).toBe(true)
    expect(isObject({ a: 1 })).toBe(true)
  })

  it('returns false for null, arrays, primitives', () => {
    expect(isObject(null)).toBe(false)
    expect(isObject([])).toBe(false)
    expect(isObject('string')).toBe(false)
    expect(isObject(42)).toBe(false)
    expect(isObject(undefined)).toBe(false)
  })
})

describe('hasProperty', () => {
  it('returns true when property exists', () => {
    expect(hasProperty({ foo: 'bar' }, 'foo')).toBe(true)
    expect(hasProperty({ code: 0 }, 'code')).toBe(true)
  })

  it('returns false when property missing', () => {
    expect(hasProperty({}, 'missing')).toBe(false)
    expect(hasProperty(null, 'anything')).toBe(false)
  })
})

describe('hasProperties', () => {
  it('returns true when all properties exist', () => {
    expect(hasProperties({ a: 1, b: 2 }, ['a', 'b'])).toBe(true)
  })

  it('returns false when any property is missing', () => {
    expect(hasProperties({ a: 1 }, ['a', 'b'])).toBe(false)
  })
})

describe('isString', () => {
  it('returns true for strings', () => {
    expect(isString('')).toBe(true)
    expect(isString('hello')).toBe(true)
  })

  it('returns false for non-strings', () => {
    expect(isString(42)).toBe(false)
    expect(isString(null)).toBe(false)
  })
})

describe('isNumber', () => {
  it('returns true for valid numbers', () => {
    expect(isNumber(0)).toBe(true)
    expect(isNumber(3.14)).toBe(true)
  })

  it('returns false for NaN and non-numbers', () => {
    expect(isNumber(Number.NaN)).toBe(false)
    expect(isNumber('5')).toBe(false)
  })
})

describe('isBoolean', () => {
  it('returns true for booleans', () => {
    expect(isBoolean(true)).toBe(true)
    expect(isBoolean(false)).toBe(true)
  })

  it('returns false for non-booleans', () => {
    expect(isBoolean(0)).toBe(false)
    expect(isBoolean('')).toBe(false)
  })
})

describe('isArray', () => {
  it('returns true for arrays', () => {
    expect(isArray([])).toBe(true)
    expect(isArray([1, 2, 3])).toBe(true)
  })

  it('returns false for non-arrays', () => {
    expect(isArray({})).toBe(false)
    expect(isArray('abc')).toBe(false)
  })
})

describe('isStringArray', () => {
  it('returns true for string arrays', () => {
    expect(isStringArray(['a', 'b', 'c'])).toBe(true)
    expect(isStringArray([])).toBe(true)
  })

  it('returns false when array has non-strings', () => {
    expect(isStringArray([1, 2])).toBe(false)
    expect(isStringArray(['a', 1])).toBe(false)
  })
})

describe('isFunction', () => {
  it('returns true for functions', () => {
    expect(isFunction(() => {})).toBe(true)
    expect(isFunction(function foo() {})).toBe(true)
  })

  it('returns false for non-functions', () => {
    expect(isFunction({})).toBe(false)
    expect(isFunction(null)).toBe(false)
  })
})

describe('isDocument', () => {
  it('returns true for object with string id', () => {
    expect(isDocument({ id: 'abc123', title: 'Test' })).toBe(true)
  })

  it('returns false without id or with non-string id', () => {
    expect(isDocument({ title: 'No id' })).toBe(false)
    expect(isDocument({ id: 123 })).toBe(false)
    expect(isDocument(null)).toBe(false)
  })
})

// ─── DB-specific guards ───────────────────────────────────────────────────────

describe('isCastError', () => {
  it('returns true for CastError-shaped objects', () => {
    expect(isCastError({ name: 'CastError', path: '_id', value: 'bad' })).toBe(true)
  })

  it('returns false for wrong name or missing path', () => {
    expect(isCastError({ name: 'Error', path: '_id' })).toBe(false)
    expect(isCastError({ name: 'CastError' })).toBe(false)
    expect(isCastError(new Error('CastError'))).toBe(false)
  })
})

describe('isDuplicateKeyError', () => {
  it('returns true for code 11000', () => {
    expect(isDuplicateKeyError({ code: 11000, keyValue: { email: 'x' } })).toBe(true)
  })

  it('returns false for other codes', () => {
    expect(isDuplicateKeyError({ code: 11001 })).toBe(false)
    expect(isDuplicateKeyError(new Error('dup'))).toBe(false)
  })
})

describe('isValidationError', () => {
  it('returns true for ValidationError-shaped objects', () => {
    expect(isValidationError({ name: 'ValidationError', errors: {} })).toBe(true)
  })

  it('returns false without errors property or wrong name', () => {
    expect(isValidationError({ name: 'ValidationError' })).toBe(false)
    expect(isValidationError({ name: 'Error', errors: {} })).toBe(false)
  })
})

describe('isPostgresUniqueError', () => {
  it('returns true for code 23505', () => {
    expect(isPostgresUniqueError({ code: '23505' })).toBe(true)
  })

  it('returns false for other codes', () => {
    expect(isPostgresUniqueError({ code: '42P01' })).toBe(false)
    expect(isPostgresUniqueError(null)).toBe(false)
  })
})

// ─── Utility guards ───────────────────────────────────────────────────────────

describe('hasMethod', () => {
  it('returns true when method exists and is a function', () => {
    expect(hasMethod({ save: () => {} }, 'save')).toBe(true)
  })

  it('returns false when property is not a function', () => {
    expect(hasMethod({ save: 'not-a-function' }, 'save')).toBe(false)
    expect(hasMethod({}, 'missing')).toBe(false)
  })
})

describe('hasSetLocale', () => {
  it('returns true when setLocale is a function', () => {
    expect(hasSetLocale({ setLocale: () => ({}) })).toBe(true)
  })

  it('returns false without setLocale', () => {
    expect(hasSetLocale({ title: 'Test' })).toBe(false)
  })
})

describe('hasToString', () => {
  it('returns true for objects with toString method', () => {
    expect(hasToString({ toString: () => 'hello' })).toBe(true)
  })

  it('returns false for non-objects', () => {
    expect(hasToString(42)).toBe(false)
  })
})

describe('assertDefined', () => {
  it('does not throw for defined values', () => {
    expect(() => assertDefined('value')).not.toThrow()
    expect(() => assertDefined(0)).not.toThrow()
    expect(() => assertDefined(false)).not.toThrow()
  })

  it('throws for null', () => {
    expect(() => assertDefined(null)).toThrow('Value is null or undefined')
  })

  it('throws for undefined', () => {
    expect(() => assertDefined(undefined, 'Custom message')).toThrow('Custom message')
  })
})

describe('assert', () => {
  it('does not throw when condition is true', () => {
    expect(() => assert(true)).not.toThrow()
    expect(() => assert(1 + 1 === 2)).not.toThrow()
  })

  it('throws when condition is false', () => {
    expect(() => assert(false)).toThrow('Assertion failed')
    expect(() => assert(false, 'custom assertion')).toThrow('custom assertion')
  })
})

describe('getDocumentId', () => {
  it('returns id when present as string', () => {
    expect(getDocumentId({ id: 'abc-123', title: 'Test' })).toBe('abc-123')
  })

  it('returns _id as string when present', () => {
    expect(getDocumentId({ _id: 'mongo-id' })).toBe('mongo-id')
  })

  it('calls toString on _id when string', () => {
    const mongoId = { toString: () => '507f1f77bcf86cd799439011' }
    expect(getDocumentId({ _id: mongoId })).toBe('507f1f77bcf86cd799439011')
  })

  it('returns undefined when no id present', () => {
    expect(getDocumentId({ title: 'No ID' })).toBeUndefined()
    expect(getDocumentId(null)).toBeUndefined()
    expect(getDocumentId('string')).toBeUndefined()
  })
})

describe('isStringRecord', () => {
  it('returns true for record with all string values', () => {
    expect(isStringRecord({ a: 'foo', b: 'bar' })).toBe(true)
    expect(isStringRecord({})).toBe(true)
  })

  it('returns false when any value is not a string', () => {
    expect(isStringRecord({ a: 'foo', b: 42 })).toBe(false)
    expect(isStringRecord(null)).toBe(false)
  })
})

describe('isVersionDocument', () => {
  const validVersionDoc = {
    documentId: 'doc-1',
    versionId: 'v-42',
    schemaName: 'Article',
    status: 'published',
    data: { title: 'Test' },
  }

  it('returns true for valid version document', () => {
    expect(isVersionDocument(validVersionDoc)).toBe(true)
  })

  it('returns false when required fields are missing', () => {
    expect(isVersionDocument({ ...validVersionDoc, documentId: undefined })).toBe(false)
    expect(isVersionDocument({ ...validVersionDoc, versionId: 123 })).toBe(false)
    expect(isVersionDocument({ ...validVersionDoc, data: 'not-an-object' })).toBe(false)
  })
})
