import type { ControllerMetadata, GraphQLConfig } from '@magnet-cms/common'
import { ContentService, DiscoveryService } from '@magnet-cms/core'
import { ApolloDriver } from '@nestjs/apollo'
import { DynamicModule, Module } from '@nestjs/common'
import { ModulesContainer } from '@nestjs/core'
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
 *
 * Generates GraphQL schema from:
 * 1. Content schemas (via DiscoveryService + ContentService) → typed CRUD operations
 * 2. NestJS controllers (via ModulesContainer) → auto-resolved queries and mutations
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

    // DiscoveryService, ContentService, and ModulesContainer are resolvable here because:
    // 1. MagnetModule sets global: true and exports DiscoveryModule and ContentModule
    // 2. buildMagnetImports() pushes MagnetGraphQLModule AFTER ContentModule in the imports
    //    array, so both services are already registered when the factory runs
    // 3. The useFactory runs during GraphQLModule.onModuleInit(), by which point
    //    DiscoveryService.onModuleInit() has already populated the schema list
    // 4. ModulesContainer is always available from @nestjs/core
    const apolloModule = GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      inject: [DiscoveryService, ContentService, ModulesContainer],
      useFactory: (
        discoveryService: DiscoveryService,
        contentService: ContentService,
        modulesContainer: ModulesContainer,
      ) => {
        const schemas = discoveryService.getAllDiscoveredSchemas()
        if (schemas.length === 0) {
          throw new Error(
            'GraphQLModule initialized before DiscoveryService — ' +
              'ensure DiscoveryModule is imported before MagnetGraphQLModule. ' +
              'Add GraphQLAdapter.forRoot() after all content schemas are registered.',
          )
        }

        // Collect controller metadata and instances from the NestJS container
        const controllerNames = discoveryService.getDiscoveredControllers()
        const controllers = controllerNames
          .map((name) => discoveryService.getDiscoveredController(name))
          .filter((c): c is ControllerMetadata => !('error' in c))

        const controllerInstances = new Map<string, object>()
        for (const nestModule of modulesContainer.values()) {
          for (const wrapper of nestModule.controllers.values()) {
            if (wrapper.instance && wrapper.metatype) {
              controllerInstances.set(
                wrapper.metatype.name.toLowerCase(),
                wrapper.instance as object,
              )
            }
          }
        }

        const schema = buildGraphQLSchema(schemas, contentService, controllers, controllerInstances)

        return {
          schema,
          path: resolvedConfig.path,
          playground: resolvedConfig.playground,
          introspection: resolvedConfig.introspection,
          debug: resolvedConfig.debug,
          // Pass the Express request to GraphQL context so resolvers
          // can access req.user (populated by auth middleware/guards)
          context: ({ req, res }: { req: unknown; res: unknown }) => ({
            req,
            res,
          }),
        }
      },
    })

    return {
      module: MagnetGraphQLModule,
      imports: [apolloModule],
    }
  }
}
