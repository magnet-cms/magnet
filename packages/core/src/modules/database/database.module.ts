import {
  type DBConfig,
  DatabaseAdapter,
  getDatabaseAdapterSingletonForFeature,
  getModelToken,
  getSchemaToken,
  registerModel,
} from '@magnet-cms/common'
import { DynamicModule, Module, Scope, Type, forwardRef } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'

// Use forwardRef to avoid loading InternationalizationModule (and its
// SettingsModule.forFeature) until after DatabaseModule.register() has run.
const modules = [
  forwardRef(
    () =>
      require('./modules/internationalization/internationalization.module')
        .InternationalizationModule,
  ),
]

// Use globalThis with Symbol.for() to share adapter state across tsup bundle chunks.
// Without this, CJS entry points (index.cjs, magnet-module-imports.cjs) each get their
// own copy of DatabaseModule with separate static properties, causing register() in one
// chunk to be invisible to forFeature() in another.
const ADAPTER_KEY = Symbol.for('@magnet-cms/core/database-adapter')

function getSharedAdapter(): DatabaseAdapter | null {
  return (
    ((globalThis as Record<symbol, unknown>)[ADAPTER_KEY] as DatabaseAdapter | undefined) ?? null
  )
}

function setSharedAdapter(adapter: DatabaseAdapter): void {
  ;(globalThis as Record<symbol, unknown>)[ADAPTER_KEY] = adapter
}

@Module({
  imports: modules,
  exports: modules,
})
export class DatabaseModule {
  /**
   * Register the database module with an adapter and config.
   *
   * @param adapter - The database adapter instance (from provider.adapter)
   * @param config - Resolved database config (from provider.config)
   */
  static register(adapter: DatabaseAdapter, config: DBConfig): DynamicModule {
    setSharedAdapter(adapter)
    const adapterOptions = adapter.connect(config)

    return {
      module: DatabaseModule,
      imports: [...(adapterOptions.imports || []), ...modules],
      providers: [...(adapterOptions.providers || [])],
      exports: [...(adapterOptions.exports || []), ...modules],
    }
  }

  /**
   * Register schemas for database access.
   *
   * Nest’s compiled CJS output often `require()`s feature modules before the
   * `AppModule` decorator runs `MagnetModule.forRoot()`, so `register()` may
   * not have run yet. In that case we fall back to the adapter singleton
   * registered by the official DB packages via
   * `registerDatabaseAdapterSingletonForFeature()` (same instance as `forRoot()`).
   */
  static forFeature(schemas: Type | Type[]): DynamicModule {
    const adapter = getSharedAdapter() ?? getDatabaseAdapterSingletonForFeature()
    if (!adapter) {
      throw new Error(
        'DatabaseModule.register() must be called before DatabaseModule.forFeature(), ' +
          'or the active DB adapter package must call registerDatabaseAdapterSingletonForFeature() on import. ' +
          'Ensure MagnetModule.forRoot() includes a database provider.',
      )
    }
    const schemasArray = Array.isArray(schemas) ? schemas : [schemas]

    const schemasProviders = schemasArray.map((schema) => ({
      imports: [adapter.forFeature(schema)],
      providers: [
        {
          provide: getModelToken(schema),
          useFactory: async (moduleRef: ModuleRef) => {
            const modelFactory = async () => {
              return await moduleRef.get(adapter.token(schema.name), {
                strict: false,
              })
            }
            const instance = new (adapter.model(modelFactory))()
            registerModel(getModelToken(schema), instance)
            return instance
          },
          inject: [ModuleRef],
          scope: Scope.DEFAULT,
        },
        {
          provide: getSchemaToken(schema),
          useClass: schema,
        },
      ],
    }))

    const imports = schemasProviders.flatMap((mp) => mp.imports)
    const providers = schemasProviders.flatMap((mp) => mp.providers)

    return {
      module: DatabaseModule,
      imports,
      providers,
      exports: [...providers],
    }
  }
}
