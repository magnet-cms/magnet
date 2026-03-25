import 'reflect-metadata'
import { beforeEach, describe, expect, it } from 'vitest'

import { Prop } from '../decorators/prop.decorator'
import { clearSchemaRegistry, generateSchema } from '../schema/schema.generator'

const SCHEMA_OPTIONS_KEY = 'magnet:schema:options'

/**
 * Helper to set up a test schema class with Drizzle metadata
 */
function createTestSchema(
  name: string,
  props: Record<string, import('@magnet-cms/common').PropOptions>,
  schemaOptions: { i18n?: boolean; versioning?: boolean } = {},
): Function {
  // Create a named class dynamically
  const SchemaClass = { [name]: class {} }[name] as Function

  // Set schema options metadata (same key as @magnet-cms/common)
  Reflect.defineMetadata(
    SCHEMA_OPTIONS_KEY,
    { i18n: true, versioning: true, visible: true, ...schemaOptions },
    SchemaClass,
  )

  // Set Drizzle prop metadata
  for (const [key, options] of Object.entries(props)) {
    Prop(options)(SchemaClass.prototype, key)
  }

  return SchemaClass
}

/** Extract a user-defined column from a generated table (skips system columns) */
function getColumn(
  table: ReturnType<typeof generateSchema>['table'],
  columnName: string,
): { config: { notNull: boolean; hasDefault: boolean } } {
  const t = table as Record<string, unknown>
  return t[columnName] as { config: { notNull: boolean; hasDefault: boolean } }
}

describe('generateColumn — notNull behavior', () => {
  beforeEach(() => clearSchemaRegistry())

  it('should NOT apply notNull to required text columns', () => {
    const TestSchema = createTestSchema('Draft', {
      tagID: { type: String, required: true, unique: true },
    })

    const { table } = generateSchema(TestSchema as any)
    const col = getColumn(table, 'tagID')

    expect(col).toBeDefined()
    expect(col.config.notNull).toBe(false)
  })

  it('should NOT apply notNull to required number columns', () => {
    const TestSchema = createTestSchema('NumTest', {
      weight: { type: Number, required: true },
    })

    const { table } = generateSchema(TestSchema as any)
    const col = getColumn(table, 'weight')

    expect(col).toBeDefined()
    expect(col.config.notNull).toBe(false)
  })

  it('should NOT apply notNull to required boolean columns', () => {
    const TestSchema = createTestSchema('BoolTest', {
      castrated: { type: Boolean, required: true },
    })

    const { table } = generateSchema(TestSchema as any)
    const col = getColumn(table, 'castrated')

    expect(col).toBeDefined()
    expect(col.config.notNull).toBe(false)
  })

  it('should NOT apply notNull to required date columns', () => {
    const TestSchema = createTestSchema('DateTest', {
      birthdate: { type: Date, required: true },
    })

    const { table } = generateSchema(TestSchema as any)
    const col = getColumn(table, 'birthdate')

    expect(col).toBeDefined()
    expect(col.config.notNull).toBe(false)
  })

  it('should still allow nullable columns to remain nullable', () => {
    const TestSchema = createTestSchema('NullableTest', {
      description: { type: String, required: false },
    })

    const { table } = generateSchema(TestSchema as any)
    const col = getColumn(table, 'description')

    expect(col).toBeDefined()
    expect(col.config.notNull).toBe(false)
  })

  it('should omit DB default for empty array default (filled at runtime)', () => {
    const TestSchema = createTestSchema('DefaultTest', {
      tags: { type: Array, required: false, default: [] },
    })

    const { table } = generateSchema(TestSchema as any)
    const col = getColumn(table, 'tags')

    expect(col).toBeDefined()
    // See DrizzleModel._applyDeclaredEmptyArrayDefaults — no SQL DEFAULT for []
    expect(col.config.hasDefault).toBe(false)
  })
})
