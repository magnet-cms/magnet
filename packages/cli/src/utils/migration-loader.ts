import { readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { Migration } from '@magnet-cms/adapter-db-drizzle'

/**
 * Load all migration files from a directory.
 * Files must match the pattern: NNNN_description.ts or NNNN_description.js
 * Each file must export a `migration` object.
 */
export async function loadMigrationsFromDirectory(
	directory: string,
): Promise<Migration[]> {
	const dir = resolve(directory)
	let files: string[]

	try {
		files = await readdir(dir)
	} catch {
		// Directory doesn't exist yet — no migrations
		return []
	}

	const migrationFiles = files
		.filter((f) => /^\d{4}_.*\.(ts|js)$/.test(f))
		.sort()

	const migrations: Migration[] = []
	for (const file of migrationFiles) {
		const filePath = join(dir, file)
		const mod = (await import(filePath)) as Record<string, unknown>
		if (mod.migration) {
			migrations.push(mod.migration as Migration)
		}
	}

	return migrations
}
