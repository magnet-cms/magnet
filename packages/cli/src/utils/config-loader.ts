import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { MigrationConfig } from '@magnet-cms/adapter-db-drizzle'

export interface MagnetCliConfig {
	databaseUrl: string
	migrations?: Partial<MigrationConfig>
	dialect?: 'postgresql' | 'mysql' | 'sqlite'
}

const CONFIG_FILES = [
	'magnet.config.ts',
	'magnet.config.js',
	'magnet.config.mjs',
]

/**
 * Load CLI configuration from project files or environment variables.
 */
export class ConfigLoader {
	constructor(private readonly cwd: string = process.cwd()) {}

	/**
	 * Load configuration. Searches for config files in CWD, falls back to env vars.
	 */
	async load(): Promise<MagnetCliConfig> {
		const fileConfig = await this.loadFromFile()
		if (fileConfig) return fileConfig

		return this.loadFromEnv()
	}

	private async loadFromFile(): Promise<MagnetCliConfig | null> {
		for (const filename of CONFIG_FILES) {
			const filePath = join(this.cwd, filename)
			if (!existsSync(filePath)) continue

			try {
				const mod = await import(filePath)
				const config = mod.default ?? mod
				if (config && typeof config === 'object') {
					return this.normalizeConfig(config)
				}
			} catch {
				// File exists but failed to parse — fall through to next file
			}
		}
		return null
	}

	private loadFromEnv(): MagnetCliConfig {
		const databaseUrl = process.env.DATABASE_URL
		if (!databaseUrl) {
			throw new Error(
				'No database configuration found. ' +
					'Create a magnet.config.ts or set the DATABASE_URL environment variable.',
			)
		}
		return { databaseUrl }
	}

	private normalizeConfig(raw: Record<string, unknown>): MagnetCliConfig {
		const databaseUrl =
			(raw.databaseUrl as string) ??
			(raw.database as Record<string, unknown>)?.url ??
			process.env.DATABASE_URL

		if (!databaseUrl || typeof databaseUrl !== 'string') {
			throw new Error(
				'Config file must export a databaseUrl string or set DATABASE_URL env var.',
			)
		}

		return {
			databaseUrl,
			migrations: (raw.migrations as Partial<MigrationConfig>) ?? undefined,
			dialect: (raw.dialect as MagnetCliConfig['dialect']) ?? 'postgresql',
		}
	}
}
