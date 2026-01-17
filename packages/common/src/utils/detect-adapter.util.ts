import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { DBConfig } from '~/types/database.types'

export type SupportedAdapter = 'mongoose' | 'drizzle'

let cachedAdapter: SupportedAdapter | null = null

function isPackageInstalled(packageName: string): boolean {
	try {
		return existsSync(join(require.resolve(packageName), '../../'))
	} catch {
		return false
	}
}

/**
 * Detect the database adapter based on configuration or installed packages.
 *
 * Detection priority:
 * 1. Configuration-based: If `connectionString` or `dialect` is present, use drizzle
 * 2. Configuration-based: If `uri` is present, use mongoose
 * 3. Package-based: Check which adapter packages are installed (mongoose > drizzle)
 *
 * @param dbConfig - Optional database configuration to determine adapter from
 */
export function detectDatabaseAdapter(dbConfig?: DBConfig): SupportedAdapter {
	// If config provided, detect from config
	if (dbConfig) {
		if ('connectionString' in dbConfig || 'dialect' in dbConfig) {
			cachedAdapter = 'drizzle'
			return cachedAdapter
		}
		if ('uri' in dbConfig) {
			cachedAdapter = 'mongoose'
			return cachedAdapter
		}
	}

	// Return cached adapter if already detected
	if (cachedAdapter) return cachedAdapter

	// Fallback to package detection
	if (isPackageInstalled('@magnet-cms/adapter-mongoose')) {
		cachedAdapter = 'mongoose'
	} else if (isPackageInstalled('@magnet-cms/adapter-drizzle')) {
		cachedAdapter = 'drizzle'
	} else {
		throw new Error(
			'❌ No supported database adapter found. Install @magnet-cms/adapter-mongoose or @magnet-cms/adapter-drizzle.',
		)
	}

	return cachedAdapter
}

/**
 * Explicitly set the database adapter.
 * Call this at the very start of your application, before importing any schemas.
 *
 * @example
 * ```typescript
 * // main.ts or app.module.ts (at the top, before other imports)
 * import { setDatabaseAdapter } from '@magnet-cms/common'
 * setDatabaseAdapter('drizzle')
 *
 * // Then import your modules
 * import { MagnetModule } from '@magnet-cms/core'
 * ```
 */
export function setDatabaseAdapter(adapter: SupportedAdapter): void {
	cachedAdapter = adapter
}

/**
 * Clear the cached adapter (useful for testing)
 */
export function clearAdapterCache(): void {
	cachedAdapter = null
}
