import {
  type AuthMagnetProvider,
  type CacheMagnetProvider,
  type DatabaseMagnetProvider,
  type EmailMagnetProvider,
  type GraphQLMagnetProvider,
  type MagnetGlobalOptions,
  MagnetModuleOptions,
  type MagnetProvider,
  type PluginMagnetProvider,
  type StorageMagnetProvider,
  type VaultMagnetProvider,
} from '@magnet-cms/common'
import { DynamicModule, Module, Type, ValidationPipe } from '@nestjs/common'
import {
  APP_FILTER,
  APP_GUARD,
  APP_INTERCEPTOR,
  APP_PIPE,
  DiscoveryModule,
  Reflector,
} from '@nestjs/core'

import { RestrictedGuard } from './guards/restricted.guard'
import { GlobalExceptionFilter } from './handlers'
import { DatabaseModule } from './modules/database/database.module'
import { EventContextInterceptor } from './modules/events/event-context.interceptor'
import { EventHandlerDiscoveryService } from './modules/events/event-handler-discovery.service'
import { EventsModule } from './modules/events/events.module'
import { HealthModule } from './modules/health/health.module'
import { LoggingInterceptor } from './modules/logging/logging.interceptor'
import { LoggingModule } from './modules/logging/logging.module'
import { normalizeMagnetAdminConfig, validateEnvironment } from './utils'

const MAGNET_PROVIDER_TYPE_IDS = new Set<string>([
  'database',
  'storage',
  'email',
  'vault',
  'auth',
  'plugin',
  'cache',
  'graphql',
])

function isMagnetProvider(value: unknown): value is MagnetProvider {
  if (value === null || typeof value !== 'object') return false
  const t = (value as { type?: unknown }).type
  return typeof t === 'string' && MAGNET_PROVIDER_TYPE_IDS.has(t)
}

function parseMagnetForRootArgs(args: unknown[]): {
  providers: MagnetProvider[]
  globalOptions?: MagnetGlobalOptions
} {
  if (args.length === 0) {
    throw new Error('MagnetModule.forRoot() requires at least one argument.')
  }
  const [head, ...tail] = args

  if (Array.isArray(head)) {
    const providers = [...head] as MagnetProvider[]
    if (tail.length > 1) {
      throw new Error(
        'MagnetModule.forRoot(): with the array form, pass at most one second argument (global options).',
      )
    }
    const maybeGlobal = tail[0]
    if (maybeGlobal === undefined) {
      return { providers }
    }
    if (isMagnetProvider(maybeGlobal)) {
      throw new Error(
        'MagnetModule.forRoot(): second argument must be global options, not a provider. ' +
          'Put all providers in the first array, or use the variadic form: forRoot(p1, p2, …).',
      )
    }
    return { providers, globalOptions: maybeGlobal as MagnetGlobalOptions }
  }

  const sequence = [head, ...tail]
  const last = sequence.at(-1)
  if (last === undefined) {
    throw new Error('MagnetModule.forRoot() requires at least one provider.')
  }

  if (isMagnetProvider(last)) {
    for (const item of sequence) {
      if (!isMagnetProvider(item)) {
        throw new Error(
          'MagnetModule.forRoot(): every argument must be a provider unless the last argument is global options.',
        )
      }
    }
    return { providers: sequence as MagnetProvider[] }
  }

  const globalOptions = last as MagnetGlobalOptions
  const providerSlice = sequence.slice(0, -1)
  if (providerSlice.length === 0) {
    throw new Error(
      'MagnetModule.forRoot(): at least one magnet provider is required before global options.',
    )
  }
  for (const item of providerSlice) {
    if (!isMagnetProvider(item)) {
      throw new Error('MagnetModule.forRoot(): only the last argument may be global options.')
    }
  }
  return {
    providers: providerSlice as MagnetProvider[],
    globalOptions,
  }
}

/**
 * Categorize providers by type from the flat array.
 */
function categorizeProviders(providers: readonly MagnetProvider[]): {
  database?: DatabaseMagnetProvider
  storage?: StorageMagnetProvider
  email?: EmailMagnetProvider
  vault?: VaultMagnetProvider
  auth?: AuthMagnetProvider
  cache?: CacheMagnetProvider
  graphql?: GraphQLMagnetProvider
  plugins: PluginMagnetProvider[]
} {
  let database: DatabaseMagnetProvider | undefined
  let storage: StorageMagnetProvider | undefined
  let email: EmailMagnetProvider | undefined
  let vault: VaultMagnetProvider | undefined
  let auth: AuthMagnetProvider | undefined
  let cache: CacheMagnetProvider | undefined
  let graphql: GraphQLMagnetProvider | undefined
  const plugins: PluginMagnetProvider[] = []

  for (const provider of providers) {
    switch (provider.type) {
      case 'database':
        database = provider
        break
      case 'storage':
        storage = provider
        break
      case 'email':
        email = provider
        break
      case 'vault':
        vault = provider
        break
      case 'auth':
        auth = provider
        break
      case 'cache':
        cache = provider
        break
      case 'graphql':
        graphql = provider
        break
      case 'plugin':
        plugins.push(provider)
        break
    }
  }

  return { database, storage, email, vault, auth, cache, graphql, plugins }
}

/**
 * Build a legacy MagnetModuleOptions from resolved providers and global options.
 * This maintains backward compatibility for services that inject MagnetModuleOptions.
 */
function buildLegacyOptions(
  categorized: ReturnType<typeof categorizeProviders>,
  globalOptions?: MagnetGlobalOptions,
): MagnetModuleOptions {
  const jwtSecret = globalOptions?.jwt?.secret || process.env.JWT_SECRET || ''

  return new MagnetModuleOptions({
    db: categorized.database?.config ?? { uri: '' },
    jwt: {
      secret: jwtSecret,
    },
    auth: categorized.auth?.config ?? { strategy: 'jwt' },
    internationalization: globalOptions?.internationalization ?? {
      locales: ['en'],
      defaultLocale: 'en',
    },
    playground: globalOptions?.playground,
    storage: undefined,
    email: undefined,
    plugins: categorized.plugins.map((p) => ({
      plugin: p.plugin,
      options: p.options,
    })),
    admin: globalOptions?.admin,
    rbac: globalOptions?.rbac,
    vault: undefined,
  })
}

@Module({})
export class MagnetModule {
  /**
   * Configure the Magnet CMS module with provider-based API.
   *
   * Each adapter/plugin provides a static `.forRoot()` that returns a typed provider.
   * Environment variables are validated upfront before NestJS bootstraps.
   *
   * @param providers - Array of MagnetProvider objects from adapter/plugin `.forRoot()` calls
   * @param globalOptions - Cross-cutting options (JWT, admin, RBAC, i18n). Admin UI serving is on by default; pass `{ admin: false }` for API-only mode.
   *
   * @example
   * ```typescript
   * import { MongooseDatabaseAdapter } from '@magnet-cms/adapter-db-mongoose'
   * import { StripePlugin } from '@magnet-cms/plugin-stripe'
   *
   * MagnetModule.forRoot([
   *   MongooseDatabaseAdapter.forRoot(),
   *   StripePlugin.forRoot({ currency: 'usd' }),
   * ])
   * ```
   *
   * Variadic form (recommended when `@typescript-eslint/no-unsafe-argument` flags a providers
   * array as `any[]`): each adapter is type-checked as its own argument, so a single loose
   * `forRoot()` does not widen the whole list.
   *
   * @example Variadic with global options as the last argument
   * ```typescript
   * MagnetModule.forRoot(
   *   DrizzleDatabaseAdapter.forRoot({ dialect: 'postgresql', driver: 'pg' }),
   *   RedisCacheAdapter.forRoot(),
   *   { admin: true },
   * )
   * ```
   */
  static forRoot(
    providers: readonly MagnetProvider[],
    globalOptions?: MagnetGlobalOptions,
  ): DynamicModule
  static forRoot(
    provider: MagnetProvider,
    ...rest: (MagnetProvider | MagnetGlobalOptions)[]
  ): DynamicModule
  static forRoot(...args: unknown[]): DynamicModule {
    const { providers, globalOptions } = parseMagnetForRootArgs(args)

    // 1. Categorize providers by type
    const categorized = categorizeProviders(providers)

    // 2. Validate: at least one database provider required
    if (!categorized.database) {
      throw new Error(
        'MagnetModule.forRoot() requires a database provider. ' +
          'Add MongooseDatabaseAdapter.forRoot() or DrizzleDatabaseAdapter.forRoot() to the providers array.',
      )
    }

    // 3. Validate environment variables (fail fast)
    validateEnvironment(providers, globalOptions)

    // 4. Build legacy options for DI backward compatibility
    const legacyOptions = buildLegacyOptions(categorized, globalOptions)

    // 5. Register database (sets shared adapter for DI and forFeature fallback).
    const DBModule = DatabaseModule.register(
      categorized.database.adapter,
      categorized.database.config,
    )
    const adminConfig = normalizeMagnetAdminConfig(globalOptions?.admin)
    const {
      buildMagnetImports,
      ApiKeysModule,
      CacheModule: _CacheModule,
      ContentModule,
      DiscoveryModule: MagnetDiscoveryModule,
      DocumentModule,
      HistoryModule,
      NotificationModule,
      PluginModule,
      RBACModule,
      SettingsModule,
    } = require('./magnet-module-imports') as {
      buildMagnetImports: (params: {
        categorized: ReturnType<typeof categorizeProviders>
        globalOptions: MagnetGlobalOptions | undefined
        adminConfig: ReturnType<typeof normalizeMagnetAdminConfig>
        DBModule: DynamicModule
      }) => {
        imports: Array<DynamicModule | Type>
        DBModule: DynamicModule
        StorageModuleConfig: DynamicModule
        VaultModuleConfig: DynamicModule
        CacheModuleConfig: DynamicModule
      }
      ApiKeysModule: Type
      CacheModule: Type
      ContentModule: Type
      DiscoveryModule: Type
      DocumentModule: Type
      HistoryModule: Type
      NotificationModule: Type
      PluginModule: Type
      RBACModule: Type
      SettingsModule: Type
    }

    const {
      imports: lazyImports,
      StorageModuleConfig,
      VaultModuleConfig,
      CacheModuleConfig,
    } = buildMagnetImports({
      categorized,
      globalOptions,
      adminConfig,
      DBModule,
    })

    const imports: Array<DynamicModule | Type> = [
      LoggingModule,
      DiscoveryModule,
      EventsModule,
      HealthModule,
      ...lazyImports,
    ]

    return {
      module: MagnetModule,
      global: true,
      imports,
      providers: [
        { provide: APP_PIPE, useClass: ValidationPipe },
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
        { provide: APP_INTERCEPTOR, useClass: EventContextInterceptor },
        { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
        { provide: MagnetModuleOptions, useValue: legacyOptions },
        { provide: APP_GUARD, useClass: RestrictedGuard },
        EventHandlerDiscoveryService,
        Reflector,
      ],
      exports: [
        MagnetModuleOptions,
        ApiKeysModule,
        CacheModuleConfig,
        ContentModule,
        DiscoveryModule,
        MagnetDiscoveryModule,
        DBModule,
        DocumentModule,
        SettingsModule,
        HistoryModule,
        HealthModule,
        NotificationModule,
        PluginModule,
        RBACModule,
        StorageModuleConfig,
        VaultModuleConfig,
      ],
    }
  }

  static async forFeature(schemas: Type | Type[]): Promise<DynamicModule> {
    return DatabaseModule.forFeature(schemas)
  }
}
