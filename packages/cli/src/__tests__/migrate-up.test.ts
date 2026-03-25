import { MigrationRunner } from '@magnet-cms/adapter-db-drizzle'
import { describe, expect, it, vi } from 'vitest'

import { runMigrateUp } from '../commands/migrate-up'

function makeMockRunner(): MigrationRunner {
  return {
    up: async () => ({ applied: 0, names: [], timings: {} }),
    down: async () => undefined,
    status: async () => ({ applied: [], pending: [] }),
  } as unknown as MigrationRunner
}

describe('runMigrateUp', () => {
  it('returns applied count 0 when no pending migrations', async () => {
    const runner = makeMockRunner()
    const result = await runMigrateUp(runner, [])

    expect(result.applied).toBe(0)
  })

  it('calls runner.up() with provided migrations', async () => {
    const runner = makeMockRunner()
    const upSpy = vi.spyOn(runner, 'up').mockResolvedValue({
      applied: 2,
      names: ['0001_init', '0002_add_users'],
      timings: { '0001_init': 10, '0002_add_users': 5 },
    })

    const migrations = [
      { id: '0001_init', timestamp: 1000, async up() {}, async down() {} },
      { id: '0002_add_users', timestamp: 2000, async up() {}, async down() {} },
    ]

    const result = await runMigrateUp(runner, migrations)

    expect(upSpy).toHaveBeenCalledWith(migrations, undefined)
    expect(result.applied).toBe(2)
    expect(result.names).toEqual(['0001_init', '0002_add_users'])
  })

  it('propagates errors from runner.up()', async () => {
    const runner = makeMockRunner()
    vi.spyOn(runner, 'up').mockRejectedValue(new Error('migration failed'))

    await expect(runMigrateUp(runner, [])).rejects.toThrow('migration failed')
  })
})
