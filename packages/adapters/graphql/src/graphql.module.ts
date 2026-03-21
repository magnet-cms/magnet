import type { GraphQLConfig } from '@magnet-cms/common'
import { ContentService, DiscoveryService } from '@magnet-cms/core'
import { ApolloDriver } from '@nestjs/apollo'
import { DynamicModule, Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import {
	DEFAULT_DEBUG,
	DEFAULT_GRAPHQL_PATH,
	DEFAULT_INTROSPECTION,
	DEFAULT_PLAYGROUND,
} from './constants'
import { buildGraphQLSchema } from './schema-builder'

/**
 * Internal NestJS module that wires Apollo Server with the auto-generated schema.
 * Named MagnetGraphQLModule to avoid conflict with @nestjs/graphql's GraphQLModule.
 */
@Module({})
export class MagnetGraphQLModule {
	static forRoot(config: GraphQLConfig): DynamicModule {
		const resolvedConfig: Required<GraphQLConfig> = {
			path: config.path ?? DEFAULT_GRAPHQL_PATH,
			playground: config.playground ?? DEFAULT_PLAYGROUND,
			introspection: config.introspection ?? DEFAULT_INTROSPECTION,
			debug: config.debug ?? DEFAULT_DEBUG,
		}

		// DiscoveryService and ContentService are resolvable here because:
		// 1. MagnetModule sets global: true and exports DiscoveryModule and ContentModule
		// 2. buildMagnetImports() pushes MagnetGraphQLModule AFTER ContentModule in the imports
		//    array, so both services are already registered when the factory runs
		// 3. The useFactory runs during GraphQLModule.onModuleInit(), by which point
		//    DiscoveryService.onModuleInit() has already populated the schema list
		const apolloModule = GraphQLModule.forRootAsync({
			driver: ApolloDriver,
			inject: [DiscoveryService, ContentService],
			useFactory: (
				discoveryService: DiscoveryService,
				contentService: ContentService,
			) => {
				const schemas = discoveryService.getAllDiscoveredSchemas()
				if (schemas.length === 0) {
					throw new Error(
						'GraphQLModule initialized before DiscoveryService — ' +
							'ensure DiscoveryModule is imported before MagnetGraphQLModule. ' +
							'Add GraphQLAdapter.forRoot() after all content schemas are registered.',
					)
				}
				const schema = buildGraphQLSchema(schemas, contentService)
				return {
					schema,
					path: resolvedConfig.path,
					playground: resolvedConfig.playground,
					introspection: resolvedConfig.introspection,
					debug: resolvedConfig.debug,
				}
			},
		})

		return {
			module: MagnetGraphQLModule,
			imports: [apolloModule],
		}
	}
}
