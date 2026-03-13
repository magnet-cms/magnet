import { describe, expect, it } from 'bun:test'
import { readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runMigrateCreate } from '../commands/migrate-create'

describe('runMigrateCreate', () => {
	it('creates empty migration template file', async () => {
		const dir = join(tmpdir(), `create-test-${Date.now()}`)

		const result = await runMigrateCreate('add_index', dir)

		expect(result.filename).toContain('add_index')
		expect(result.filename).toMatch(/^\d{4}_/)

		const content = await readFile(result.path, 'utf-8')
		expect(content).toContain('async up(db')
		expect(content).toContain('async down(db')
		expect(content).toContain('TODO')

		await rm(dir, { recursive: true })
	})

	it('creates sequentially numbered file', async () => {
		const dir = join(tmpdir(), `create-test-${Date.now()}`)
		await Bun.write(join(dir, '0001_initial.ts'), '')

		const result = await runMigrateCreate('next_migration', dir)

		expect(result.filename).toBe('0002_next_migration.ts')
		await rm(dir, { recursive: true })
	})

	it('file content is valid TypeScript migration structure', async () => {
		const dir = join(tmpdir(), `create-test-${Date.now()}`)

		const result = await runMigrateCreate('my_migration', dir)
		const content = await readFile(result.path, 'utf-8')

		expect(content).toContain('export const migration')
		expect(content).toContain("'@magnet-cms/adapter-drizzle'")

		await rm(dir, { recursive: true })
	})
})
