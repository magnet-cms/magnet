import { describe, expect, it, vi } from 'vitest'

import { MigrationHistory } from '../migration-history'
import { MigrationLock } from '../migration-lock'
import { MigrationRunner } from '../migration-runner'
import { DEFAULT_MIGRATION_CONFIG, MigrationChecksumError } from '../types'
import type { Migration, MigrationDb, MigrationHistoryRecord } from '../types'

function makeMockDb(): MigrationDb {
  return {
    async execute(_sql: string) {
      return { rows: [] }
    },
  }
}

function makeMigration(id: string, timestamp = 1000): Migration {
  return {
    id,
    timestamp,
    async up(_db) {},
    async down(_db) {},
  }
}

describe('MigrationRunner', () => {
  it('up() with no pending migrations does nothing', async () => {
    const db = makeMockDb()
    const runner = new MigrationRunner(db, DEFAULT_MIGRATION_CONFIG)

    const historySpy = vi.spyOn(MigrationHistory.prototype, 'getApplied').mockResolvedValue([])
    const lockAcquire = vi.spyOn(MigrationLock.prototype, 'acquire').mockResolvedValue(undefined)
    const lockRelease = vi.spyOn(MigrationLock.prototype, 'release').mockResolvedValue(undefined)
    const ensureHistory = vi
      .spyOn(MigrationHistory.prototype, 'ensureTable')
      .mockResolvedValue(undefined)
    const ensureLock = vi.spyOn(MigrationLock.prototype, 'ensureTable').mockResolvedValue(undefined)

    const result = await runner.up([])

    expect(result.applied).toBe(0)
    expect(lockRelease).toHaveBeenCalled()

    historySpy.mockRestore()
    lockAcquire.mockRestore()
    lockRelease.mockRestore()
    ensureHistory.mockRestore()
    ensureLock.mockRestore()
  })

  it('up() applies pending migrations in order', async () => {
    const db = makeMockDb()
    const runner = new MigrationRunner(db, DEFAULT_MIGRATION_CONFIG)

    const applied: string[] = []
    const m1 = {
      ...makeMigration('0001', 1000),
      async up(_db: MigrationDb) {
        applied.push('0001')
      },
    }
    const m2 = {
      ...makeMigration('0002', 2000),
      async up(_db: MigrationDb) {
        applied.push('0002')
      },
    }

    vi.spyOn(MigrationHistory.prototype, 'ensureTable').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'ensureTable').mockResolvedValue(undefined)
    vi.spyOn(MigrationHistory.prototype, 'getApplied').mockResolvedValue([])
    vi.spyOn(MigrationHistory.prototype, 'recordMigration').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'acquire').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'release').mockResolvedValue(undefined)

    const result = await runner.up([m1, m2])

    expect(result.applied).toBe(2)
    expect(applied).toEqual(['0001', '0002'])
  })

  it('down() rolls back the last migration', async () => {
    const db = makeMockDb()
    const runner = new MigrationRunner(db, DEFAULT_MIGRATION_CONFIG)

    const rolledBack: string[] = []
    const m1 = {
      ...makeMigration('0001', 1000),
      async down(_db: MigrationDb) {
        rolledBack.push('0001')
      },
    }
    const history: MigrationHistoryRecord[] = [
      {
        id: '0001',
        name: '0001',
        timestamp: 1000,
        appliedAt: new Date(),
        checksum: MigrationHistory.calculateChecksum(m1.up, m1.down),
      },
    ]

    vi.spyOn(MigrationHistory.prototype, 'ensureTable').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'ensureTable').mockResolvedValue(undefined)
    vi.spyOn(MigrationHistory.prototype, 'getApplied').mockResolvedValue(history)
    vi.spyOn(MigrationHistory.prototype, 'removeMigration').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'acquire').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'release').mockResolvedValue(undefined)

    await runner.down([m1])

    expect(rolledBack).toEqual(['0001'])
  })

  it('status() returns applied and pending', async () => {
    const db = makeMockDb()
    const runner = new MigrationRunner(db, DEFAULT_MIGRATION_CONFIG)

    const m1 = makeMigration('0001', 1000)
    const m2 = makeMigration('0002', 2000)
    const appliedHistory: MigrationHistoryRecord[] = [
      {
        id: '0001',
        name: '0001',
        timestamp: 1000,
        appliedAt: new Date(),
        checksum: 'abc',
      },
    ]

    vi.spyOn(MigrationHistory.prototype, 'ensureTable').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'ensureTable').mockResolvedValue(undefined)
    vi.spyOn(MigrationHistory.prototype, 'getApplied').mockResolvedValue(appliedHistory)

    const status = await runner.status([m1, m2])

    expect(status.applied.length).toBe(1)
    expect(status.applied[0].id).toBe('0001')
    expect(status.pending.length).toBe(1)
    expect(status.pending[0].id).toBe('0002')
  })

  it('lock is released even when migration fails', async () => {
    const db = makeMockDb()
    const runner = new MigrationRunner(db, DEFAULT_MIGRATION_CONFIG)

    const failingMigration: Migration = {
      ...makeMigration('0001'),
      async up() {
        throw new Error('migration failed')
      },
    }

    vi.spyOn(MigrationHistory.prototype, 'ensureTable').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'ensureTable').mockResolvedValue(undefined)
    vi.spyOn(MigrationHistory.prototype, 'getApplied').mockResolvedValue([])
    vi.spyOn(MigrationLock.prototype, 'acquire').mockResolvedValue(undefined)
    const releaseSpy = vi.spyOn(MigrationLock.prototype, 'release').mockResolvedValue(undefined)

    await expect(runner.up([failingMigration])).rejects.toThrow('migration failed')
    expect(releaseSpy).toHaveBeenCalled()
  })

  it('up() detects checksum mismatch for already-applied migration', async () => {
    const db = makeMockDb()
    const runner = new MigrationRunner(db, DEFAULT_MIGRATION_CONFIG)

    const m1 = makeMigration('0001', 1000)
    const appliedHistory: MigrationHistoryRecord[] = [
      {
        id: '0001',
        name: '0001',
        timestamp: 1000,
        appliedAt: new Date(),
        checksum: 'wrong_checksum',
      },
    ]

    vi.spyOn(MigrationHistory.prototype, 'ensureTable').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'ensureTable').mockResolvedValue(undefined)
    vi.spyOn(MigrationHistory.prototype, 'getApplied').mockResolvedValue(appliedHistory)
    vi.spyOn(MigrationLock.prototype, 'acquire').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'release').mockResolvedValue(undefined)

    await expect(runner.up([m1])).rejects.toBeInstanceOf(MigrationChecksumError)
  })

  it('down() with target rolls back multiple migrations stopping at target', async () => {
    const db = makeMockDb()
    const runner = new MigrationRunner(db, DEFAULT_MIGRATION_CONFIG)

    const rolledBack: string[] = []
    const m1 = {
      ...makeMigration('0001', 1000),
      async down(_db: MigrationDb) {
        rolledBack.push('0001')
      },
    }
    const m2 = {
      ...makeMigration('0002', 2000),
      async down(_db: MigrationDb) {
        rolledBack.push('0002')
      },
    }
    const m3 = {
      ...makeMigration('0003', 3000),
      async down(_db: MigrationDb) {
        rolledBack.push('0003')
      },
    }

    const appliedHistory: MigrationHistoryRecord[] = [
      {
        id: '0001',
        name: '0001',
        timestamp: 1000,
        appliedAt: new Date(),
        checksum: MigrationHistory.calculateChecksum(m1.up, m1.down),
      },
      {
        id: '0002',
        name: '0002',
        timestamp: 2000,
        appliedAt: new Date(),
        checksum: MigrationHistory.calculateChecksum(m2.up, m2.down),
      },
      {
        id: '0003',
        name: '0003',
        timestamp: 3000,
        appliedAt: new Date(),
        checksum: MigrationHistory.calculateChecksum(m3.up, m3.down),
      },
    ]

    vi.spyOn(MigrationHistory.prototype, 'ensureTable').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'ensureTable').mockResolvedValue(undefined)
    const getAppliedSpy = vi.spyOn(MigrationHistory.prototype, 'getApplied')
    // First call returns all 3, subsequent calls simulate progressively fewer
    getAppliedSpy.mockResolvedValueOnce(appliedHistory)
    getAppliedSpy.mockResolvedValueOnce(appliedHistory.slice(0, 2))
    vi.spyOn(MigrationHistory.prototype, 'removeMigration').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'acquire').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'release').mockResolvedValue(undefined)

    // Roll back to 0001 (exclusive): should roll back 0003 and 0002 but not 0001
    await runner.down([m1, m2, m3], { to: '0001' })

    expect(rolledBack).toEqual(['0003', '0002'])
  })

  it('up() wraps migrations in transactions when config.transactional is true', async () => {
    const sqlCalls: string[] = []
    const db: MigrationDb = {
      async execute(sql: string) {
        sqlCalls.push(sql)
        return { rows: [] }
      },
    }
    const runner = new MigrationRunner(db, {
      ...DEFAULT_MIGRATION_CONFIG,
      transactional: true,
    })

    const m1 = makeMigration('0001', 1000)

    vi.spyOn(MigrationHistory.prototype, 'ensureTable').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'ensureTable').mockResolvedValue(undefined)
    vi.spyOn(MigrationHistory.prototype, 'getApplied').mockResolvedValue([])
    vi.spyOn(MigrationHistory.prototype, 'recordMigration').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'acquire').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'release').mockResolvedValue(undefined)

    await runner.up([m1])

    expect(sqlCalls).toContain('BEGIN')
    expect(sqlCalls).toContain('COMMIT')
  })

  it('up() rolls back transaction on migration failure when transactional', async () => {
    const sqlCalls: string[] = []
    const db: MigrationDb = {
      async execute(sql: string) {
        sqlCalls.push(sql)
        return { rows: [] }
      },
    }
    const runner = new MigrationRunner(db, {
      ...DEFAULT_MIGRATION_CONFIG,
      transactional: true,
    })

    const failingMigration: Migration = {
      ...makeMigration('0001'),
      async up() {
        throw new Error('sql error')
      },
    }

    vi.spyOn(MigrationHistory.prototype, 'ensureTable').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'ensureTable').mockResolvedValue(undefined)
    vi.spyOn(MigrationHistory.prototype, 'getApplied').mockResolvedValue([])
    vi.spyOn(MigrationLock.prototype, 'acquire').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'release').mockResolvedValue(undefined)

    await expect(runner.up([failingMigration])).rejects.toThrow('sql error')

    expect(sqlCalls).toContain('BEGIN')
    expect(sqlCalls).toContain('ROLLBACK')
    expect(sqlCalls).not.toContain('COMMIT')
  })

  it('full cycle: up() applies migrations then down() removes them', async () => {
    const db = makeMockDb()
    const runner = new MigrationRunner(db, DEFAULT_MIGRATION_CONFIG)

    const appliedIds: string[] = []
    const rolledBackIds: string[] = []
    const m1 = {
      ...makeMigration('0001', 1000),
      async up(_db: MigrationDb) {
        appliedIds.push('0001')
      },
      async down(_db: MigrationDb) {
        rolledBackIds.push('0001')
      },
    }
    const m2 = {
      ...makeMigration('0002', 2000),
      async up(_db: MigrationDb) {
        appliedIds.push('0002')
      },
      async down(_db: MigrationDb) {
        rolledBackIds.push('0002')
      },
    }

    vi.spyOn(MigrationHistory.prototype, 'ensureTable').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'ensureTable').mockResolvedValue(undefined)
    const _recordSpy = vi
      .spyOn(MigrationHistory.prototype, 'recordMigration')
      .mockResolvedValue(undefined)
    const removeSpy = vi
      .spyOn(MigrationHistory.prototype, 'removeMigration')
      .mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'acquire').mockResolvedValue(undefined)
    vi.spyOn(MigrationLock.prototype, 'release').mockResolvedValue(undefined)

    // First call for up() returns empty; second call for down() returns both applied
    const getAppliedSpy = vi.spyOn(MigrationHistory.prototype, 'getApplied')
    getAppliedSpy.mockResolvedValueOnce([])
    getAppliedSpy.mockResolvedValueOnce([
      {
        id: '0001',
        name: '0001',
        timestamp: 1000,
        appliedAt: new Date(),
        checksum: MigrationHistory.calculateChecksum(m1.up, m1.down),
      },
      {
        id: '0002',
        name: '0002',
        timestamp: 2000,
        appliedAt: new Date(),
        checksum: MigrationHistory.calculateChecksum(m2.up, m2.down),
      },
    ])

    const upResult = await runner.up([m1, m2])
    expect(upResult.applied).toBe(2)
    expect(appliedIds).toEqual(['0001', '0002'])

    await runner.down([m1, m2])
    expect(rolledBackIds).toEqual(['0002'])
    expect(removeSpy.mock.calls.length).toBeGreaterThanOrEqual(1)
  })
})
