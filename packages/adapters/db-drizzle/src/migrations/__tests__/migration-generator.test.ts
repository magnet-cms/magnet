import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { MigrationGenerator } from '../migration-generator'

describe('MigrationGenerator', () => {
  it('generate() produces TypeScript migration file content', () => {
    const gen = new MigrationGenerator()
    const upSQL = ['CREATE TABLE "users" ("id" uuid PRIMARY KEY)']
    const downSQL = ['DROP TABLE "users"']

    const content = gen.generate('initial_schema', upSQL, downSQL)

    expect(content).toContain('export const migration')
    expect(content).toContain('initial_schema')
    expect(content).toContain('CREATE TABLE')
    expect(content).toContain('DROP TABLE')
    expect(content).toContain('async up(db: MigrationDb)')
    expect(content).toContain('async down(db: MigrationDb)')
  })

  it('generate() includes dangerous flag when specified', () => {
    const gen = new MigrationGenerator()
    const content = gen.generate('drop_users', ['DROP TABLE "users"'], [], {
      dangerous: true,
      warnings: ['Dropping users table will lose all user data'],
    })

    expect(content).toContain('dangerous: true')
    expect(content).toContain('Dropping users table')
  })

  it('generate() does not include dangerous flag when not dangerous', () => {
    const gen = new MigrationGenerator()
    const content = gen.generate('add_users', ['CREATE TABLE "users" ()'], [])

    expect(content).not.toContain('dangerous:')
  })

  it('generate() executes multiple SQL statements', () => {
    const gen = new MigrationGenerator()
    const upSQL = [
      'CREATE TABLE "users" ("id" uuid)',
      'CREATE INDEX "users_id_idx" ON "users" ("id")',
    ]
    const content = gen.generate('multi_stmt', upSQL, [])

    expect(content).toContain('CREATE TABLE')
    expect(content).toContain('CREATE INDEX')
  })

  it('nextMigrationNumber() returns 1 for empty directory', async () => {
    const dir = join(tmpdir(), `migrations-test-${Date.now()}`)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, '.gitkeep'), '', 'utf-8')

    const gen = new MigrationGenerator()
    const num = await gen.nextMigrationNumber(dir)

    expect(num).toBe(1)
    await rm(dir, { recursive: true })
  })

  it('nextMigrationNumber() increments from existing files', async () => {
    const dir = join(tmpdir(), `migrations-test-${Date.now()}`)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, '0001_initial.ts'), '', 'utf-8')
    await writeFile(join(dir, '0002_add_users.ts'), '', 'utf-8')

    const gen = new MigrationGenerator()
    const num = await gen.nextMigrationNumber(dir)

    expect(num).toBe(3)
    await rm(dir, { recursive: true })
  })

  it('writeMigrationFile() creates sequentially numbered file', async () => {
    const dir = join(tmpdir(), `migrations-test-${Date.now()}`)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, '.gitkeep'), '', 'utf-8')

    const gen = new MigrationGenerator()
    const { filename } = await gen.writeMigrationFile(dir, 'add_users', 'content')

    expect(filename).toBe('0001_add_users.ts')
    const files = await readdir(dir)
    expect(files).toContain('0001_add_users.ts')
    await rm(dir, { recursive: true })
  })

  it('writeMigrationFile() numbers sequentially after existing files', async () => {
    const dir = join(tmpdir(), `migrations-test-${Date.now()}`)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, '0001_initial.ts'), '', 'utf-8')

    const gen = new MigrationGenerator()
    const { filename } = await gen.writeMigrationFile(dir, 'add_users', 'content')

    expect(filename).toBe('0002_add_users.ts')
    await rm(dir, { recursive: true })
  })
})
