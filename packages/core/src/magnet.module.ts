import {
	type AuthMagnetProvider,
	type CacheMagnetProvider,
	type DatabaseMagnetProvider,
	type EmailMagnetProvider,
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
} from '@nestjs/core'
import { RestrictedGuard } from './guards/restricted.guard'
import { GlobalExceptionFilter } from './handlers'
import { DatabaseModule } from './modules/database/database.module'
import { EventContextInterceptor } from './modules/events/event-context.interceptor'
import { EventsModule } from './modules/events/events.module'
import { HealthModule } from './modules/health/health.module'
import { LoggingInterceptor } from './modules/logging/logging.interceptor'
import { LoggingModule } from './modules/logging/logging.module'
import { normalizeMagnetAdminConfig, validateEnvironment } from './utils'

/**
 * Categorize providers by type from the flat array.
 */
function categorizeProviders(providers: MagnetProvider[]): {
	database?: DatabaseMagnetProvider
	storage?: StorageMagnetProvider
	email?: EmailMagnetProvider
	vault?: VaultMagnetProvider
	auth?: AuthMagnetProvider
	cache?: CacheMagnetProvider
	plugins: PluginMagnetProvider[]
} {
	let database: DatabaseMagnetProvider | undefined
	let storage: StorageMagnetProvider | undefined
	let email: EmailMagnetProvider | undefined
	let vault: VaultMagnetProvider | undefined
	let auth: AuthMagnetProvider | undefined
	let cache: CacheMagnetProvider | undefined
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
			case 'plugin':
				plugins.push(provider)
				break
		}
	}

	return { database, storage, email, vault, auth, cache, plugins }
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
	 */
	static forRoot(
		providers: MagnetProvider[],
		globalOptions?: MagnetGlobalOptions,
	): DynamicModule {
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
			CacheModule,
			ContentModule,
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
			],
			exports: [
				MagnetModuleOptions,
				ApiKeysModule,
				CacheModuleConfig,
				ContentModule,
				DiscoveryModule,
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
