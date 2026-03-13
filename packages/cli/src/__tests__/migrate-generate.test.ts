import { describe, expect, it, spyOn } from 'bun:test'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
	MigrationGenerator,
	SchemaBridge,
	SchemaDiff,
} from '@magnet-cms/adapter-drizzle'
import type { SnapshotJSON } from '@magnet-cms/adapter-drizzle'
import { runMigrateGenerate } from '../commands/migrate-generate'

function makeSnapshot(): SnapshotJSON {
	return {
		id: 'test',
		prevId: '0000',
		version: '7',
		dialect: 'postgresql',
		tables: {},
	} as unknown as SnapshotJSON
}

describe('runMigrateGenerate', () => {
	it('returns isEmpty=true when no schema changes', async () => {
		const bridge = new SchemaBridge()
		const diff = new SchemaDiff(bridge)
		const gen = new MigrationGenerator()

		spyOn(diff, 'diff').mockResolvedValue({
			upSQL: [],
			dangerous: false,
			warnings: [],
			isEmpty: true,
			currentSnapshot: makeSnapshot(),
		})

		const result = await runMigrateGenerate(
			diff,
			gen,
			'add_users',
			'/tmp/migrations',
			{
				dryRun: false,
				dialect: 'postgresql',
			},
		)

		expect(result.isEmpty).toBe(true)
		expect(result.filename).toBeUndefined()
	})

	it('returns dry-run content without writing file', async () => {
		const bridge = new SchemaBridge()
		const diff = new SchemaDiff(bridge)
		const gen = new MigrationGenerator()

		spyOn(diff, 'diff').mockResolvedValue({
			upSQL: ['CREATE TABLE "users" ("id" uuid PRIMARY KEY)'],
			dangerous: false,
			warnings: [],
			isEmpty: false,
			currentSnapshot: makeSnapshot(),
		})

		const writeSpy = spyOn(gen, 'writeMigrationFile')

		const result = await runMigrateGenerate(
			diff,
			gen,
			'add_users',
			'/tmp/migrations',
			{
				dryRun: true,
				dialect: 'postgresql',
			},
		)

		expect(result.isEmpty).toBe(false)
		expect(result.content).toContain('CREATE TABLE')
		expect(writeSpy).not.toHaveBeenCalled()
	})

	it('writes migration file when not dry-run and changes exist', async () => {
		const dir = join(tmpdir(), `gen-test-${Date.now()}`)
		const bridge = new SchemaBridge()
		const diff = new SchemaDiff(bridge)
		const gen = new MigrationGenerator()

		spyOn(diff, 'diff').mockResolvedValue({
			upSQL: ['CREATE TABLE "users" ("id" uuid)'],
			dangerous: false,
			warnings: [],
			isEmpty: false,
			currentSnapshot: makeSnapshot(),
		})

		const result = await runMigrateGenerate(diff, gen, 'add_users', dir, {
			dryRun: false,
			dialect: 'postgresql',
		})

		expect(result.isEmpty).toBe(false)
		expect(result.filename).toContain('add_users')
		await rm(dir, { recursive: true })
	})

	it('includes dangerous flag in result when warnings exist', async () => {
		const bridge = new SchemaBridge()
		const diff = new SchemaDiff(bridge)
		const gen = new MigrationGenerator()

		spyOn(diff, 'diff').mockResolvedValue({
			upSQL: ['DROP TABLE "users"'],
			dangerous: true,
			warnings: ['DROP TABLE will delete all data'],
			isEmpty: false,
			currentSnapshot: makeSnapshot(),
		})

		const result = await runMigrateGenerate(
			diff,
			gen,
			'drop_users',
			'/tmp/migrations',
			{
				dryRun: true,
				dialect: 'postgresql',
			},
		)

		expect(result.dangerous).toBe(true)
		expect(result.warnings).toHaveLength(1)
	})
})
