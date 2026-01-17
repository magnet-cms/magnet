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
			DatabaseAdapterFactory.cachedAdapter = require(
				`@magnet-cms/adapter-${adapterName}`,
			).Adapter
		} catch (error) {
			throw new Error(`Adapter ${adapterName} not found`)
		}

		return DatabaseAdapterFactory.cachedAdapter
	}
}
