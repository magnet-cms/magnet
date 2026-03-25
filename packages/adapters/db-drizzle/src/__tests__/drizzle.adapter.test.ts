import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Adapter } from '../drizzle.adapter'

// Helper to extract SQL string from drizzle sql.raw() object
function extractSQL(rawObj: unknown): string {
  const obj = rawObj as {
    queryChunks?: Array<{ value?: string[] }>
  }
  return obj?.queryChunks?.[0]?.value?.[0] ?? ''
}

// Reset adapter state between tests by casting to access private fields
function resetAdapter() {
  const a = Adapter as unknown as Record<string, unknown>
  a.db = null
  a.options = null
  a.tablesInitialized = false
  a.schemaRegistry = new Map()
}

describe('DrizzleAdapter.ensureTablesCreated', () => {
  beforeEach(() => resetAdapter())

  it('does nothing when db is null', async () => {
    // No db set — should return early without error
    await expect(Adapter.ensureTablesCreated()).resolves.toBeUndefined()
  })

  it('does nothing when schemaRegistry is empty', async () => {
    const a = Adapter as unknown as Record<string, unknown>
    a.db = {} // simulate a connected db
    // schemaRegistry is empty (size 0)
    await expect(Adapter.ensureTablesCreated()).resolves.toBeUndefined()
  })

  it('calls legacy createTables when no migrations config', async () => {
    const a = Adapter as unknown as Record<string, unknown>
    a.db = {}
    a.options = { db: { connectionString: 'postgresql://localhost/test' } }
    ;(a.schemaRegistry as Map<string, unknown>).set('Test', {
      table: {},
      tableName: 'tests',
    })

    const createTablesSpy = vi
      .spyOn(Adapter as unknown as { createTables: () => Promise<void> }, 'createTables')
      .mockResolvedValue(undefined)
    const runAutoSpy = vi
      .spyOn(
        Adapter as unknown as {
          runAutoMigration: (c: unknown) => Promise<void>
        },
        'runAutoMigration',
      )
      .mockResolvedValue(undefined)

    await Adapter.ensureTablesCreated()

    expect(createTablesSpy).toHaveBeenCalled()
    expect(runAutoSpy).not.toHaveBeenCalled()

    createTablesSpy.mockRestore()
    runAutoSpy.mockRestore()
  })

  it('calls runAutoMigration when migrations config is present', async () => {
    const a = Adapter as unknown as Record<string, unknown>
    a.db = {}
    a.options = {
      connectionString: 'postgresql://localhost/test',
      migrations: { mode: 'manual', directory: './migrations' },
    }
    ;(a.schemaRegistry as Map<string, unknown>).set('Test', {
      table: {},
      tableName: 'tests',
    })

    const createTablesSpy = vi
      .spyOn(Adapter as unknown as { createTables: () => Promise<void> }, 'createTables')
      .mockResolvedValue(undefined)
    const runAutoSpy = vi
      .spyOn(
        Adapter as unknown as {
          runAutoMigration: (c: unknown) => Promise<void>
        },
        'runAutoMigration',
      )
      .mockResolvedValue(undefined)

    await Adapter.ensureTablesCreated()

    expect(runAutoSpy).toHaveBeenCalled()
    expect(createTablesSpy).not.toHaveBeenCalled()

    createTablesSpy.mockRestore()
    runAutoSpy.mockRestore()
  })

  it('sets tablesInitialized = true after running', async () => {
    const a = Adapter as unknown as Record<string, unknown>
    a.db = {}
    a.options = { db: { connectionString: 'postgresql://localhost/test' } }
    ;(a.schemaRegistry as Map<string, unknown>).set('Test', {
      table: {},
      tableName: 'tests',
    })

    vi.spyOn(
      Adapter as unknown as { createTables: () => Promise<void> },
      'createTables',
    ).mockResolvedValue(undefined)

    await Adapter.ensureTablesCreated()

    expect(a.tablesInitialized).toBe(true)
  })
})

describe('DrizzleAdapter.createTableFromConfig — primary key detection', () => {
  let capturedSQLs: string[]
  let execSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    capturedSQLs = []
    const a = Adapter as unknown as Record<string, unknown>
    a.db = { execute: async () => {} }
    a.options = { dialect: 'postgresql' }
    a.tablesInitialized = false

    // Spy on execRawSQL to capture generated SQL strings
    execSpy = vi
      .spyOn(Adapter as unknown as { execRawSQL: (s: unknown) => Promise<void> }, 'execRawSQL')
      .mockImplementation(async (rawSQL: unknown) => {
        capturedSQLs.push(extractSQL(rawSQL))
      })
  })

  afterEach(() => {
    execSpy.mockRestore()
  })

  it('emits PRIMARY KEY constraint for column-level .primaryKey()', async () => {
    const config = {
      name: 'users',
      primaryKeys: [], // empty — simulates getTableConfig() for single-column PK
      columns: [
        {
          name: 'id',
          primary: true,
          notNull: true,
          hasDefault: false,
          getSQLType: () => 'uuid',
        },
        {
          name: 'email',
          primary: false,
          notNull: false,
          hasDefault: false,
          getSQLType: () => 'text',
        },
      ],
      indexes: {},
    }

    const adapter = Adapter as unknown as {
      createTableFromConfig: (config: Record<string, unknown>, dialect: string) => Promise<void>
    }
    await adapter.createTableFromConfig(config as unknown as Record<string, unknown>, 'postgresql')

    // First SQL call is CREATE TABLE
    const createSQL = capturedSQLs[0] ?? ''
    expect(createSQL).toContain('PRIMARY KEY')
    expect(createSQL).toContain('"id"')
  })

  it('does not double-emit PRIMARY KEY when table-level primaryKeys is set', async () => {
    const config = {
      name: 'users',
      primaryKeys: ['id'], // table-level PK already specified
      columns: [
        {
          name: 'id',
          primary: false, // column-level not set (as drizzle does for composite)
          notNull: true,
          hasDefault: false,
          getSQLType: () => 'uuid',
        },
      ],
      indexes: {},
    }

    const adapter = Adapter as unknown as {
      createTableFromConfig: (config: Record<string, unknown>, dialect: string) => Promise<void>
    }
    await adapter.createTableFromConfig(config as unknown as Record<string, unknown>, 'postgresql')

    const createSQL = capturedSQLs[0] ?? ''
    const pkCount = (createSQL.match(/PRIMARY KEY/g) ?? []).length
    expect(pkCount).toBe(1)
  })
})
