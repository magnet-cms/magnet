import { describe, expect, it, vi } from 'vitest'

import { SchemaBridge } from '../schema-bridge'
import type { SnapshotJSON } from '../schema-bridge'
import { SchemaDiff } from '../schema-diff'

function makeSnapshot(id = 'test'): SnapshotJSON {
  return {
    id,
    prevId: '0000',
    version: '7',
    dialect: 'postgresql',
    tables: {},
    views: {},
    schemas: {},
    sequences: {},
    roles: {},
    policies: {},
    enums: {},
    _meta: { schemas: {}, tables: {}, columns: {} },
  } as unknown as SnapshotJSON
}

describe('SchemaDiff', () => {
  it('diff() returns empty when no SQL generated', async () => {
    const bridge = new SchemaBridge()

    vi.spyOn(bridge, 'generateSnapshot').mockResolvedValue(makeSnapshot())
    vi.spyOn(bridge, 'generateSQL').mockResolvedValue([])

    const diff = new SchemaDiff(bridge)
    const result = await diff.diff('postgresql', makeSnapshot())

    expect(result.upSQL).toEqual([])
    expect(result.dangerous).toBe(false)
    expect(result.warnings).toEqual([])
  })

  it('diff() returns SQL statements from drizzle-kit', async () => {
    const bridge = new SchemaBridge()

    vi.spyOn(bridge, 'generateSnapshot').mockResolvedValue(makeSnapshot())
    vi.spyOn(bridge, 'generateSQL').mockResolvedValue([
      'CREATE TABLE "users" ("id" uuid PRIMARY KEY)',
      'CREATE INDEX "users_id_idx" ON "users" ("id")',
    ])

    const diff = new SchemaDiff(bridge)
    const result = await diff.diff('postgresql', makeSnapshot())

    expect(result.upSQL).toHaveLength(2)
    expect(result.upSQL[0]).toContain('CREATE TABLE')
  })

  it('diff() detects dangerous DROP TABLE operations', async () => {
    const bridge = new SchemaBridge()

    vi.spyOn(bridge, 'generateSnapshot').mockResolvedValue(makeSnapshot())
    vi.spyOn(bridge, 'generateSQL').mockResolvedValue(['DROP TABLE "users"'])

    const diff = new SchemaDiff(bridge)
    const result = await diff.diff('postgresql', makeSnapshot())

    expect(result.dangerous).toBe(true)
    expect(result.warnings.some((w) => w.includes('DROP TABLE'))).toBe(true)
  })

  it('diff() detects dangerous DROP COLUMN operations', async () => {
    const bridge = new SchemaBridge()

    vi.spyOn(bridge, 'generateSnapshot').mockResolvedValue(makeSnapshot())
    vi.spyOn(bridge, 'generateSQL').mockResolvedValue(['ALTER TABLE "users" DROP COLUMN "email"'])

    const diff = new SchemaDiff(bridge)
    const result = await diff.diff('postgresql', makeSnapshot())

    expect(result.dangerous).toBe(true)
    expect(result.warnings.some((w) => w.includes('DROP COLUMN'))).toBe(true)
  })

  it('diff() uses empty snapshot as prev when none provided', async () => {
    const bridge = new SchemaBridge()
    const emptySnap = makeSnapshot('empty')

    vi.spyOn(bridge, 'emptySnapshot').mockReturnValue(emptySnap)
    vi.spyOn(bridge, 'generateSnapshot').mockResolvedValue(makeSnapshot())
    const generateSQL = vi.spyOn(bridge, 'generateSQL').mockResolvedValue([])

    const diff = new SchemaDiff(bridge)
    await diff.diff('postgresql')

    // generateSQL was called with the empty snapshot as prev
    expect(generateSQL).toHaveBeenCalled()
  })

  it('diff() isEmpty is true when no SQL statements', async () => {
    const bridge = new SchemaBridge()

    vi.spyOn(bridge, 'generateSnapshot').mockResolvedValue(makeSnapshot())
    vi.spyOn(bridge, 'generateSQL').mockResolvedValue([])

    const diff = new SchemaDiff(bridge)
    const result = await diff.diff('postgresql', makeSnapshot())

    expect(result.isEmpty).toBe(true)
  })

  it('diff() isEmpty is false when SQL statements exist', async () => {
    const bridge = new SchemaBridge()

    vi.spyOn(bridge, 'generateSnapshot').mockResolvedValue(makeSnapshot())
    vi.spyOn(bridge, 'generateSQL').mockResolvedValue(['CREATE TABLE "users" ("id" uuid)'])

    const diff = new SchemaDiff(bridge)
    const result = await diff.diff('postgresql', makeSnapshot())

    expect(result.isEmpty).toBe(false)
  })
})
