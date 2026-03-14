import {
	type DBConfig,
	DatabaseAdapter,
	detectDatabaseAdapter,
} from '@magnet-cms/common'

export class DatabaseAdapterFactory {
	private static cachedAdapter: DatabaseAdapter

	static getAdapter(dbConfig?: DBConfig): DatabaseAdapter {
		if (DatabaseAdapterFactory.cachedAdapter)
			return DatabaseAdapterFactory.cachedAdapter

		const adapterName = detectDatabaseAdapter(dbConfig)

		try {
			const packageMap: Record<string, string> = {
				mongoose: '@magnet-cms/adapter-db-mongoose',
				drizzle: '@magnet-cms/adapter-db-drizzle',
			}
			const packageName =
				packageMap[adapterName] ?? `@magnet-cms/adapter-db-${adapterName}`
			DatabaseAdapterFactory.cachedAdapter = require(packageName).Adapter
		} catch (error) {
			throw new Error(`Adapter ${adapterName} not found`)
		}

		return DatabaseAdapterFactory.cachedAdapter
	}
}
