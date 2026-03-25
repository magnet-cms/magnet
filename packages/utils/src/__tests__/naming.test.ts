import { describe, expect, it } from 'vitest'

import { toCamelCase, toKebabCase, toPascalCase, toSnakeCase } from '../naming'

describe('toSnakeCase', () => {
  it('converts camelCase to snake_case', () => {
    expect(toSnakeCase('createdAt')).toBe('created_at')
    expect(toSnakeCase('userId')).toBe('user_id')
  })

  it('handles consecutive capitals (tagID -> tag_id)', () => {
    expect(toSnakeCase('tagID')).toBe('tag_id')
    expect(toSnakeCase('userID')).toBe('user_id')
    expect(toSnakeCase('HTMLParser')).toBe('html_parser')
  })

  it('handles already lowercase input', () => {
    expect(toSnakeCase('name')).toBe('name')
  })

  it('handles empty string', () => {
    expect(toSnakeCase('')).toBe('')
  })
})

describe('toCamelCase', () => {
  it('converts snake_case to camelCase', () => {
    expect(toCamelCase('created_at')).toBe('createdAt')
    expect(toCamelCase('user_id')).toBe('userId')
  })

  it('handles multiple underscores', () => {
    expect(toCamelCase('first_middle_last')).toBe('firstMiddleLast')
  })

  it('handles already camelCase input (no underscores)', () => {
    expect(toCamelCase('alreadyCamel')).toBe('alreadyCamel')
  })

  it('handles empty string', () => {
    expect(toCamelCase('')).toBe('')
  })
})

describe('toKebabCase', () => {
  it('converts PascalCase to kebab-case', () => {
    expect(toKebabCase('MedicalRecord')).toBe('medical-record')
    expect(toKebabCase('UserProfile')).toBe('user-profile')
  })

  it('converts camelCase to kebab-case', () => {
    expect(toKebabCase('myComponent')).toBe('my-component')
  })

  it('replaces non-alphanumeric characters with hyphens', () => {
    expect(toKebabCase('Hello World')).toBe('hello-world')
  })

  it('collapses multiple hyphens', () => {
    expect(toKebabCase('Hello  World')).toBe('hello-world')
  })
})

describe('toPascalCase', () => {
  it('converts kebab-case to PascalCase', () => {
    expect(toPascalCase('medical-record')).toBe('MedicalRecord')
    expect(toPascalCase('user-profile')).toBe('UserProfile')
  })

  it('handles single word', () => {
    expect(toPascalCase('cat')).toBe('Cat')
  })

  it('handles empty string', () => {
    expect(toPascalCase('')).toBe('')
  })
})
