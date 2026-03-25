import type { SchemaMetadata, SchemaProperty } from '@magnet-cms/common'
import { describe, expect, it } from 'vitest'

import { enrichDocumentWithSchemas, mapFieldTypeToOASSchema } from '../openapi.schema-gen'
import type { OASDocument } from '../openapi.types'

function makeProp(
  overrides: Partial<SchemaProperty> & { name: string; type: string },
): SchemaProperty {
  return {
    isArray: false,
    unique: false,
    required: false,
    validations: [],
    ...overrides,
  }
}

function makeSchema(
  name: string,
  properties: SchemaProperty[],
  className = 'Article',
): SchemaMetadata {
  return { name, className, apiName: name, displayName: name, properties }
}

function makeDoc(): OASDocument {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {},
    components: { schemas: {}, securitySchemes: {} },
  }
}

// ─── mapFieldTypeToOASSchema ──────────────────────────────────────────────────

describe('mapFieldTypeToOASSchema', () => {
  it('maps text → string', () => {
    expect(mapFieldTypeToOASSchema(makeProp({ name: 'x', type: 'text' }))).toEqual({
      type: 'string',
    })
  })

  it('maps number → number', () => {
    expect(mapFieldTypeToOASSchema(makeProp({ name: 'x', type: 'number' }))).toEqual({
      type: 'number',
    })
  })

  it('maps boolean → boolean', () => {
    expect(mapFieldTypeToOASSchema(makeProp({ name: 'x', type: 'boolean' }))).toEqual({
      type: 'boolean',
    })
  })

  it('maps date → string with date-time format', () => {
    expect(mapFieldTypeToOASSchema(makeProp({ name: 'x', type: 'date' }))).toEqual({
      type: 'string',
      format: 'date-time',
    })
  })

  it('maps datetime → string with date-time format', () => {
    expect(mapFieldTypeToOASSchema(makeProp({ name: 'x', type: 'datetime' }))).toEqual({
      type: 'string',
      format: 'date-time',
    })
  })

  it('maps json → object', () => {
    expect(mapFieldTypeToOASSchema(makeProp({ name: 'x', type: 'json' }))).toEqual({
      type: 'object',
    })
  })

  it('maps object → object', () => {
    expect(mapFieldTypeToOASSchema(makeProp({ name: 'x', type: 'object' }))).toEqual({
      type: 'object',
    })
  })

  it('maps richtext → string', () => {
    expect(mapFieldTypeToOASSchema(makeProp({ name: 'x', type: 'richtext' }))).toEqual({
      type: 'string',
    })
  })

  it('maps markdown → string', () => {
    expect(mapFieldTypeToOASSchema(makeProp({ name: 'x', type: 'markdown' }))).toEqual({
      type: 'string',
    })
  })

  it('maps image → string', () => {
    expect(mapFieldTypeToOASSchema(makeProp({ name: 'x', type: 'image' }))).toMatchObject({
      type: 'string',
    })
  })

  it('maps file → string', () => {
    expect(mapFieldTypeToOASSchema(makeProp({ name: 'x', type: 'file' }))).toMatchObject({
      type: 'string',
    })
  })

  it('maps relationship → string', () => {
    expect(mapFieldTypeToOASSchema(makeProp({ name: 'x', type: 'relationship' }))).toMatchObject({
      type: 'string',
    })
  })

  it('maps tags → array of strings', () => {
    expect(mapFieldTypeToOASSchema(makeProp({ name: 'x', type: 'tags' }))).toEqual({
      type: 'array',
      items: { type: 'string' },
    })
  })

  it('maps array → array of strings', () => {
    expect(mapFieldTypeToOASSchema(makeProp({ name: 'x', type: 'array' }))).toEqual({
      type: 'array',
      items: { type: 'string' },
    })
  })

  it('maps blocks → array of objects', () => {
    expect(mapFieldTypeToOASSchema(makeProp({ name: 'x', type: 'blocks' }))).toEqual({
      type: 'array',
      items: { type: 'object' },
    })
  })

  it('maps select → string', () => {
    expect(mapFieldTypeToOASSchema(makeProp({ name: 'x', type: 'select' }))).toMatchObject({
      type: 'string',
    })
  })

  it('maps enum → string', () => {
    expect(mapFieldTypeToOASSchema(makeProp({ name: 'x', type: 'enum' }))).toMatchObject({
      type: 'string',
    })
  })

  it('maps unknown type → string (fallback)', () => {
    expect(mapFieldTypeToOASSchema(makeProp({ name: 'x', type: 'unknown-future-type' }))).toEqual({
      type: 'string',
    })
  })
})

// ─── enrichDocumentWithSchemas ────────────────────────────────────────────────

describe('enrichDocumentWithSchemas', () => {
  it('should add component schema named after className', () => {
    const doc = makeDoc()
    const schema = makeSchema('article', [makeProp({ name: 'title', type: 'text' })], 'Article')
    enrichDocumentWithSchemas(doc, [schema])
    expect(doc.components?.schemas).toHaveProperty('Article')
  })

  it('should use schema.name as fallback key when className is missing', () => {
    const doc = makeDoc()
    const schema = makeSchema('article', [], undefined)
    schema.className = undefined
    enrichDocumentWithSchemas(doc, [schema])
    expect(doc.components?.schemas).toHaveProperty('article')
  })

  it('should generate properties from SchemaProperty[]', () => {
    const doc = makeDoc()
    const schema = makeSchema('article', [
      makeProp({ name: 'title', type: 'text' }),
      makeProp({ name: 'views', type: 'number' }),
    ])
    enrichDocumentWithSchemas(doc, [schema])
    const articleSchema = doc.components?.schemas?.Article
    expect(articleSchema?.properties?.title).toEqual({ type: 'string' })
    expect(articleSchema?.properties?.views).toEqual({ type: 'number' })
  })

  it('should list required fields', () => {
    const doc = makeDoc()
    const schema = makeSchema('article', [
      makeProp({ name: 'title', type: 'text', required: true }),
      makeProp({ name: 'views', type: 'number', required: false }),
    ])
    enrichDocumentWithSchemas(doc, [schema])
    expect(doc.components?.schemas?.Article?.required).toContain('title')
    expect(doc.components?.schemas?.Article?.required).not.toContain('views')
  })

  it('should wrap array properties with isArray=true', () => {
    const doc = makeDoc()
    const schema = makeSchema('article', [makeProp({ name: 'tags', type: 'text', isArray: true })])
    enrichDocumentWithSchemas(doc, [schema])
    const tagsSchema = doc.components?.schemas?.Article?.properties?.tags
    expect(tagsSchema?.type).toBe('array')
    expect(tagsSchema?.items).toEqual({ type: 'string' })
  })

  it('should initialize components.schemas if undefined', () => {
    const doc: OASDocument = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
    }
    enrichDocumentWithSchemas(doc, [makeSchema('post', [])])
    expect(doc.components?.schemas).toBeDefined()
  })

  it('should handle empty schema list without error', () => {
    const doc = makeDoc()
    expect(() => enrichDocumentWithSchemas(doc, [])).not.toThrow()
  })
})
