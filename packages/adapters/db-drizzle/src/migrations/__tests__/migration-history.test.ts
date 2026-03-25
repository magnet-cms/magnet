import { describe, expect, it } from 'vitest'

import { MigrationHistory } from '../migration-history'
import type { MigrationDb, MigrationHistoryRecord } from '../types'

function makeMockDb(rows: unknown[] = []): {
  db: MigrationDb
  executed: string[]
} {
  const executed: string[] = []
  const db: MigrationDb = {
    async execute(sql: string) {
      executed.push(sql)
      return { rows }
    },
  }
  return { db, executed }
}

describe('MigrationHistory', () => {
  it('ensureTable() executes CREATE TABLE IF NOT EXISTS', async () => {
    const { db, executed } = makeMockDb()
    const history = new MigrationHistory(db, '_magnet_migrations')
    await history.ensureTable()
    expect(executed.length).toBe(1)
    expect(executed[0]).toContain('CREATE TABLE IF NOT EXISTS')
    expect(executed[0]).toContain('_magnet_migrations')
  })

  it('getApplied() returns ordered records', async () => {
    const rows = [
      {
        id: '001',
        name: '001',
        timestamp: 1000,
        applied_at: new Date().toISOString(),
        checksum: 'abc',
      },
      {
        id: '002',
        name: '002',
        timestamp: 2000,
        applied_at: new Date().toISOString(),
        checksum: 'def',
      },
    ]
    const { db } = makeMockDb(rows)
    const history = new MigrationHistory(db, '_magnet_migrations')
    const applied = await history.getApplied()
    expect(applied.length).toBe(2)
    expect(applied[0].id).toBe('001')
    expect(applied[1].id).toBe('002')
  })

  it('recordMigration() executes INSERT', async () => {
    const { db, executed } = makeMockDb()
    const history = new MigrationHistory(db, '_magnet_migrations')
    const record: MigrationHistoryRecord = {
      id: '001_initial',
      name: '001_initial',
      timestamp: 1706180400000,
      appliedAt: new Date('2024-01-25'),
      checksum: 'abc123',
    }
    await history.recordMigration(record)
    expect(executed.length).toBe(1)
    expect(executed[0]).toContain('INSERT')
    expect(executed[0]).toContain('_magnet_migrations')
  })

  it('removeMigration() executes DELETE', async () => {
    const { db, executed } = makeMockDb()
    const history = new MigrationHistory(db, '_magnet_migrations')
    await history.removeMigration('001_initial')
    expect(executed.length).toBe(1)
    expect(executed[0]).toContain('DELETE')
    expect(executed[0]).toContain('_magnet_migrations')
    expect(executed[0]).toContain('001_initial')
  })

  it('calculateChecksum() returns consistent hash for same input', () => {
    const up = async () => {}
    const down = async () => {}
    const h1 = MigrationHistory.calculateChecksum(up, down)
    const h2 = MigrationHistory.calculateChecksum(up, down)
    expect(h1).toBe(h2)
    expect(h1.length).toBe(16)
  })

  it('calculateChecksum() returns different hash for different functions', () => {
    const up1 = async () => {}
    const up2 = async () => {
      return 1
    }
    const down = async () => {}
    const h1 = MigrationHistory.calculateChecksum(up1, down)
    const h2 = MigrationHistory.calculateChecksum(up2, down)
    expect(h1).not.toBe(h2)
  })
})
