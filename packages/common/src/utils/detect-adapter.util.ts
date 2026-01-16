import { existsSync } from 'node:fs'
import { join } from 'node:path'

let cachedAdapter: 'mongoose' | 'typeorm' | null = null

function isPackageInstalled(packageName: string): boolean {
	try {
		return existsSync(join(require.resolve(packageName), '../../'))
	} catch {
		return false
	}
}

export function detectDatabaseAdapter(): 'mongoose' | 'typeorm' {
	if (cachedAdapter) return cachedAdapter

	if (isPackageInstalled('@magnet-cms/adapter-mongoose')) {
		cachedAdapter = 'mongoose'
	} else if (isPackageInstalled('@magnet-cms/adapter-typeorm')) {
		cachedAdapter = 'typeorm'
	} else {
		throw new Error(
			'❌ No supported database adapter found. Install @magnet-cms/adapter-mongoose or @magnet-cms/adapter-typeorm.',
		)
	}

	return cachedAdapter
}
