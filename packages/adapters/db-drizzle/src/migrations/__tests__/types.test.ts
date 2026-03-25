import { describe, expect, it } from 'vitest'

import {
  DEFAULT_MIGRATION_CONFIG,
  MigrationChecksumError,
  MigrationError,
  MigrationLockError,
} from '../types'
import type { DiffResult, Migration, MigrationConfig, MigrationHistoryRecord } from '../types'

describe('Migration types', () => {
  it('DEFAULT_MIGRATION_CONFIG has correct defaults', () => {
    expect(DEFAULT_MIGRATION_CONFIG.mode).toBe('auto')
    expect(DEFAULT_MIGRATION_CONFIG.directory).toBe('./migrations')
    expect(DEFAULT_MIGRATION_CONFIG.tableName).toBe('_magnet_migrations')
    expect(DEFAULT_MIGRATION_CONFIG.lockTableName).toBe('_magnet_migrations_lock')
    expect(DEFAULT_MIGRATION_CONFIG.lockTimeout).toBe(30000)
    expect(DEFAULT_MIGRATION_CONFIG.transactional).toBe(true)
  })

  it('MigrationError has correct name', () => {
    const err = new MigrationError('test error', 'migration_001')
    expect(err.name).toBe('MigrationError')
    expect(err.message).toBe('test error')
    expect(err.migrationId).toBe('migration_001')
    expect(err instanceof Error).toBe(true)
  })

  it('MigrationLockError has correct name', () => {
    const err = new MigrationLockError('migration_001')
    expect(err.name).toBe('MigrationLockError')
    expect(err instanceof MigrationError).toBe(true)
  })

  it('MigrationChecksumError has correct name and includes ids', () => {
    const err = new MigrationChecksumError('migration_001', 'expected_hash', 'actual_hash')
    expect(err.name).toBe('MigrationChecksumError')
    expect(err.message).toContain('migration_001')
    expect(err.message).toContain('expected_hash')
    expect(err.message).toContain('actual_hash')
    expect(err instanceof MigrationError).toBe(true)
  })

  it('Migration interface is structurally valid', () => {
    const migration: Migration = {
      id: '0001_initial',
      timestamp: 1706180400000,
      description: 'Initial schema',
      dangerous: false,
      warnings: [],
      async up() {},
      async down() {},
    }
    expect(migration.id).toBe('0001_initial')
    expect(migration.timestamp).toBe(1706180400000)
  })

  it('MigrationConfig interface is structurally valid', () => {
    const config: MigrationConfig = {
      mode: 'manual',
      directory: './migrations',
      tableName: '_magnet_migrations',
      lockTableName: '_magnet_migrations_lock',
      lockTimeout: 60000,
      transactional: true,
    }
    expect(config.mode).toBe('manual')
  })

  it('MigrationHistoryRecord interface is structurally valid', () => {
    const record: MigrationHistoryRecord = {
      id: '0001_initial',
      name: '0001_initial',
      timestamp: 1706180400000,
      appliedAt: new Date(),
      checksum: 'abc123',
    }
    expect(record.id).toBe('0001_initial')
  })

  it('DiffResult interface is structurally valid', () => {
    const diff: DiffResult = {
      tablesToCreate: [],
      tablesToDrop: [],
      columnsToAdd: [],
      columnsToRemove: [],
      columnsToAlter: [],
      indexesToAdd: [],
      indexesToRemove: [],
      isEmpty: true,
    }
    expect(diff.isEmpty).toBe(true)
  })
})
