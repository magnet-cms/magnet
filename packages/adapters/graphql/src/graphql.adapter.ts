import type { GraphQLConfig, GraphQLMagnetProvider } from '@magnet-cms/common'
import { MagnetGraphQLModule } from './graphql.module'

/**
 * GraphQL adapter for Magnet CMS.
 * Auto-generates Apollo Server with full CRUD + publish/locale schema from content models.
 *
 * @example
 * ```typescript
 * MagnetModule.forRoot([
 *   MongooseDatabaseAdapter.forRoot(),
 *   GraphQLAdapter.forRoot(),
 * ])
 * ```
 */
export class GraphQLAdapter {
	/**
	 * Create a configured GraphQL provider for MagnetModule.forRoot().
	 * Generates the full Apollo Server module from discovered content schemas at startup.
	 *
	 * @param config - Optional GraphQL configuration. All fields have defaults.
	 * @returns A GraphQLMagnetProvider to pass to MagnetModule.forRoot()
	 */
	static forRoot(config: Partial<GraphQLConfig> = {}): GraphQLMagnetProvider {
		const resolvedConfig: GraphQLConfig = {
			path: config.path ?? '/graphql',
			playground: config.playground ?? true,
			introspection: config.introspection ?? true,
			debug: config.debug ?? false,
		}

		return {
			type: 'graphql',
			module: MagnetGraphQLModule.forRoot(resolvedConfig),
			config: resolvedConfig,
			envVars: [],
		}
	}
}
