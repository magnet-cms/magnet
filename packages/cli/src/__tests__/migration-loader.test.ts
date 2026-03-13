import { describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadMigrationsFromDirectory } from '../utils/migration-loader'

async function makeTmpDir(): Promise<string> {
	const dir = join(tmpdir(), `migration-loader-test-${Date.now()}`)
	await mkdir(dir, { recursive: true })
	return dir
}

describe('loadMigrationsFromDirectory', () => {
	it('returns empty array when directory does not exist', async () => {
		const result = await loadMigrationsFromDirectory('/nonexistent/path/xyz')
		expect(result).toEqual([])
	})

	it('returns empty array when directory has no migration files', async () => {
		const dir = await makeTmpDir()
		try {
			await writeFile(join(dir, 'README.md'), '# migrations')
			await writeFile(join(dir, '.gitkeep'), '')
			const result = await loadMigrationsFromDirectory(dir)
			expect(result).toEqual([])
		} finally {
			await rm(dir, { recursive: true })
		}
	})

	it('loads migration files matching NNNN_ prefix pattern', async () => {
		const dir = await makeTmpDir()
		try {
			const migrationContent = `
export const migration = {
	id: '0001_initial',
	timestamp: 1000,
	async up(db) { await db.execute('CREATE TABLE test (id TEXT)') },
	async down(db) { await db.execute('DROP TABLE test') },
}
`
			await writeFile(join(dir, '0001_initial.js'), migrationContent)
			const result = await loadMigrationsFromDirectory(dir)
			expect(result).toHaveLength(1)
			expect(result[0]?.id).toBe('0001_initial')
		} finally {
			await rm(dir, { recursive: true })
		}
	})

	it('returns migrations sorted by filename (which equals sort by number)', async () => {
		const dir = await makeTmpDir()
		try {
			const makeMigration = (id: string, ts: number) => `
export const migration = { id: '${id}', timestamp: ${ts}, async up() {}, async down() {} }
`
			await writeFile(
				join(dir, '0002_second.js'),
				makeMigration('0002_second', 2000),
			)
			await writeFile(
				join(dir, '0001_first.js'),
				makeMigration('0001_first', 1000),
			)
			await writeFile(
				join(dir, '0003_third.js'),
				makeMigration('0003_third', 3000),
			)

			const result = await loadMigrationsFromDirectory(dir)
			expect(result).toHaveLength(3)
			expect(result[0]?.id).toBe('0001_first')
			expect(result[1]?.id).toBe('0002_second')
			expect(result[2]?.id).toBe('0003_third')
		} finally {
			await rm(dir, { recursive: true })
		}
	})

	it('ignores files without the NNNN_ prefix', async () => {
		const dir = await makeTmpDir()
		try {
			await writeFile(join(dir, 'helper.js'), 'export function help() {}')
			await writeFile(join(dir, 'config.ts'), 'export const config = {}')
			await writeFile(
				join(dir, '0001_valid.js'),
				'export const migration = { id: "0001_valid", timestamp: 1, async up() {}, async down() {} }',
			)
			const result = await loadMigrationsFromDirectory(dir)
			expect(result).toHaveLength(1)
			expect(result[0]?.id).toBe('0001_valid')
		} finally {
			await rm(dir, { recursive: true })
		}
	})

	it('skips files that do not export a migration object', async () => {
		const dir = await makeTmpDir()
		try {
			await writeFile(join(dir, '0001_no_export.js'), 'export const foo = 42')
			const result = await loadMigrationsFromDirectory(dir)
			expect(result).toHaveLength(0)
		} finally {
			await rm(dir, { recursive: true })
		}
	})
})
