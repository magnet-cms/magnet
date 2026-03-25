import type { SchemaMetadata, SchemaProperty } from '@magnet-cms/common'

import type { OASDocument, OASSchema } from './openapi.types'

/**
 * Maps a single SchemaProperty type to an OpenAPI schema object.
 * Array wrapping (isArray) is handled by the caller.
 */
export function mapFieldTypeToOASSchema(prop: SchemaProperty): OASSchema {
  switch (prop.type) {
    case 'number':
      return { type: 'number' }
    case 'boolean':
      return { type: 'boolean' }
    case 'date':
    case 'datetime':
      return { type: 'string', format: 'date-time' }
    case 'json':
    case 'object':
      return { type: 'object' }
    case 'blocks':
      return { type: 'array', items: { type: 'object' } }
    case 'tags':
    case 'array':
      return { type: 'array', items: { type: 'string' } }
    case 'image':
    case 'file':
    case 'gallery':
      return { type: 'string', description: 'Media URL or ID' }
    case 'relationship':
      return { type: 'string', description: 'Document ID reference' }
    case 'select':
    case 'enum':
      return { type: 'string' }
    // All string-like types fall through to default
    default:
      return { type: 'string' }
  }
}

/**
 * Enriches an OASDocument with component schemas derived from discovered
 * content schemas. Schemas are named by their `className` (PascalCase) or
 * fall back to `schema.name`.
 */
export function enrichDocumentWithSchemas(doc: OASDocument, schemas: SchemaMetadata[]): void {
  if (schemas.length === 0) return

  if (!doc.components) {
    doc.components = {}
  }
  if (!doc.components.schemas) {
    doc.components.schemas = {}
  }

  for (const schema of schemas) {
    const key = schema.className ?? schema.name
    const properties: Record<string, OASSchema> = {}
    const required: string[] = []

    for (const prop of schema.properties) {
      const base = mapFieldTypeToOASSchema(prop)
      properties[prop.name] = prop.isArray ? { type: 'array', items: base } : base

      if (prop.required) {
        required.push(prop.name)
      }
    }

    doc.components.schemas[key] = {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
    }
  }
}
