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
 * With the provider-based API, the adapter is typically auto-registered:
 * importing `@magnet-cms/adapter-db-mongoose` or `@magnet-cms/adapter-db-drizzle`
 * calls `setDatabaseAdapter()` as a module-level side effect, so detection
 * happens automatically before any `@Schema()` decorators evaluate.
 *
 * Detection priority:
 * 1. Cached value from `setDatabaseAdapter()` (set by adapter package import side effect)
 * 2. Configuration-based: If `connectionString` or `dialect` is present, use drizzle
 * 3. Configuration-based: If `uri` is present, use mongoose
 * 4. Package-based: Check which adapter packages are installed (mongoose > drizzle)
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
	if (isPackageInstalled('@magnet-cms/adapter-db-mongoose')) {
		cachedAdapter = 'mongoose'
	} else if (isPackageInstalled('@magnet-cms/adapter-db-drizzle')) {
		cachedAdapter = 'drizzle'
	} else {
		throw new Error(
			'❌ No supported database adapter found. Install @magnet-cms/adapter-db-mongoose or @magnet-cms/adapter-db-drizzle.',
		)
	}

	return cachedAdapter
}

/**
 * Explicitly set the database adapter.
 *
 * With the provider-based API, this is called automatically as a side effect
 * when importing an adapter package (e.g., `@magnet-cms/adapter-db-drizzle`).
 * Manual calls are no longer needed in typical user code.
 *
 * @internal Called by adapter package index.ts as module-level side effect
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
