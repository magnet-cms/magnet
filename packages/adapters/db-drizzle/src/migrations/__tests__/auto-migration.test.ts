import { describe, expect, it, vi } from 'vitest'

import { AutoMigration } from '../auto-migration'
import { MigrationGenerator } from '../migration-generator'
import { MigrationRunner } from '../migration-runner'
import { SchemaBridge } from '../schema-bridge'
import { SchemaDiff } from '../schema-diff'
import { DEFAULT_MIGRATION_CONFIG } from '../types'
import type { MigrationDb } from '../types'

function makeMockDb(): MigrationDb {
  return {
    async execute(_sql: string) {
      return { rows: [] }
    },
  }
}

function makeAutoMigration(): {
  auto: AutoMigration
  bridge: SchemaBridge
  diff: SchemaDiff
  gen: MigrationGenerator
  runner: MigrationRunner
} {
  const db = makeMockDb()
  const bridge = new SchemaBridge()
  const diff = new SchemaDiff(bridge)
  const gen = new MigrationGenerator()
  const runner = new MigrationRunner(db, DEFAULT_MIGRATION_CONFIG)
  const auto = new AutoMigration(bridge, diff, gen, runner)
  return { auto, bridge, diff, gen, runner }
}

describe('AutoMigration', () => {
  it('does nothing when diff is empty', async () => {
    const { auto, diff, runner } = makeAutoMigration()

    vi.spyOn(diff, 'diff').mockResolvedValue({
      upSQL: [],
      dangerous: false,
      warnings: [],
      isEmpty: true,
      currentSnapshot: {} as never,
    })
    const upSpy = vi.spyOn(runner, 'up').mockResolvedValue({
      applied: 0,
      names: [],
      timings: {},
    })

    await auto.run('postgresql', DEFAULT_MIGRATION_CONFIG, '/tmp/migrations')

    expect(upSpy).not.toHaveBeenCalled()
  })

  it('generates and applies migration in auto mode', async () => {
    const { auto, diff, gen, runner } = makeAutoMigration()

    vi.spyOn(diff, 'diff').mockResolvedValue({
      upSQL: ['CREATE TABLE "users" ("id" uuid)'],
      dangerous: false,
      warnings: [],
      isEmpty: false,
      currentSnapshot: {} as never,
    })
    const writeSpy = vi.spyOn(gen, 'writeMigrationFile').mockResolvedValue({
      filename: '0001_auto.ts',
      path: '/tmp/migrations/0001_auto.ts',
    })
    vi.spyOn(runner, 'up').mockResolvedValue({
      applied: 1,
      names: ['0001_auto'],
      timings: {},
    })

    await auto.run('postgresql', { ...DEFAULT_MIGRATION_CONFIG, mode: 'auto' }, '/tmp/migrations')

    expect(writeSpy).toHaveBeenCalled()
  })

  it('logs warning in manual mode without applying', async () => {
    const { auto, diff, gen, runner } = makeAutoMigration()

    vi.spyOn(diff, 'diff').mockResolvedValue({
      upSQL: ['CREATE TABLE "users" ("id" uuid)'],
      dangerous: false,
      warnings: [],
      isEmpty: false,
      currentSnapshot: {} as never,
    })
    const writeSpy = vi.spyOn(gen, 'writeMigrationFile')
    const upSpy = vi.spyOn(runner, 'up')

    await auto.run('postgresql', { ...DEFAULT_MIGRATION_CONFIG, mode: 'manual' }, '/tmp/migrations')

    expect(writeSpy).not.toHaveBeenCalled()
    expect(upSpy).not.toHaveBeenCalled()
  })

  it('in auto mode: applies generated migration via runner.up()', async () => {
    const { auto, diff, gen, runner } = makeAutoMigration()

    vi.spyOn(diff, 'diff').mockResolvedValue({
      upSQL: ['CREATE TABLE "users" ("id" uuid)'],
      dangerous: false,
      warnings: [],
      isEmpty: false,
      currentSnapshot: {} as never,
    })
    vi.spyOn(gen, 'writeMigrationFile').mockResolvedValue({
      filename: '0001_auto.ts',
      path: '/tmp/migrations/0001_auto.ts',
    })
    const upSpy = vi.spyOn(runner, 'up').mockResolvedValue({
      applied: 1,
      names: ['0001_auto'],
      timings: {},
    })

    await auto.run('postgresql', { ...DEFAULT_MIGRATION_CONFIG, mode: 'auto' }, '/tmp/migrations')

    expect(upSpy).toHaveBeenCalled()
  })
})
