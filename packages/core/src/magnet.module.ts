import {
	type AuthMagnetProvider,
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
import { ActivityModule } from './modules/activity/activity.module'
import {
	AdminServeModule,
	type AdminServeOptions,
} from './modules/admin-serve/admin-serve.module'
import { AdminModule } from './modules/admin/admin.module'
import { ApiKeysModule } from './modules/api-keys/api-keys.module'
import { AuthModule } from './modules/auth/auth.module'
import { ContentModule } from './modules/content/content.module'
import { DatabaseModule } from './modules/database/database.module'
import { DocumentModule } from './modules/document/document.module'
import { EmailModule } from './modules/email/email.module'
import { EnvironmentModule } from './modules/environment/environment.module'
import { EventContextInterceptor } from './modules/events/event-context.interceptor'
import { EventsModule } from './modules/events/events.module'
import { GeneralModule } from './modules/general/general.module'
import { HealthModule } from './modules/health/health.module'
import { HistoryModule } from './modules/history/history.module'
import { LoggingInterceptor } from './modules/logging/logging.interceptor'
import { LoggingModule } from './modules/logging/logging.module'
import { NotificationModule } from './modules/notification/notification.module'
import { PluginModule } from './modules/plugin/plugin.module'
import { RBACModule } from './modules/rbac/rbac.module'
import { SettingsModule } from './modules/settings/settings.module'
import { StorageModule } from './modules/storage/storage.module'
import { VaultModule } from './modules/vault/vault.module'
import { ViewConfigModule } from './modules/view-config/view-config.module'
import { WebhookModule } from './modules/webhook/webhook.module'
import { validateEnvironment } from './utils'

/**
 * Normalizes admin configuration to AdminServeOptions
 */
function normalizeAdminConfig(
	admin?: boolean | { enabled?: boolean; path?: string; distPath?: string },
): AdminServeOptions {
	if (admin === true) {
		return { enabled: true, path: '/admin' }
	}
	if (admin === false || admin === undefined) {
		return { enabled: false, path: '/admin' }
	}
	return {
		enabled: admin.enabled ?? true,
		path: admin.path ?? '/admin',
		distPath: admin.distPath,
	}
}

/**
 * Categorize providers by type from the flat array.
 */
function categorizeProviders(providers: MagnetProvider[]): {
	database?: DatabaseMagnetProvider
	storage?: StorageMagnetProvider
	email?: EmailMagnetProvider
	vault?: VaultMagnetProvider
	auth?: AuthMagnetProvider
	plugins: PluginMagnetProvider[]
} {
	let database: DatabaseMagnetProvider | undefined
	let storage: StorageMagnetProvider | undefined
	let email: EmailMagnetProvider | undefined
	let vault: VaultMagnetProvider | undefined
	let auth: AuthMagnetProvider | undefined
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
			case 'plugin':
				plugins.push(provider)
				break
		}
	}

	return { database, storage, email, vault, auth, plugins }
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
	 * @param globalOptions - Cross-cutting options (JWT, admin, RBAC, i18n)
	 *
	 * @example
	 * ```typescript
	 * import { MongooseDatabaseAdapter } from '@magnet-cms/adapter-db-mongoose'
	 * import { StripePlugin } from '@magnet-cms/plugin-stripe'
	 *
	 * MagnetModule.forRoot([
	 *   MongooseDatabaseAdapter.forRoot(),
	 *   StripePlugin.forRoot({ currency: 'usd' }),
	 * ], { admin: true })
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

		// 5. Build module imports — pass providers directly to modules
		const DBModule = DatabaseModule.register(
			categorized.database.adapter,
			categorized.database.config,
		)
		const StorageModuleConfig = StorageModule.forRoot(
			categorized.storage?.adapter,
			categorized.storage?.config,
		)
		const VaultModuleConfig = VaultModule.forRoot(
			categorized.vault?.adapter,
			categorized.vault?.adapterFactory,
			categorized.vault?.config,
		)
		const AuthModuleConfig = AuthModule.forRoot(
			categorized.auth?.config ?? { strategy: 'jwt' },
		)

		const pluginConfigs = categorized.plugins.map((p) => ({
			plugin: p.plugin,
			options: p.options,
		}))

		const adminConfig = normalizeAdminConfig(globalOptions?.admin)
		const imports: Array<DynamicModule | Type> = [
			LoggingModule,
			ActivityModule,
			AdminModule,
			ApiKeysModule,
			AuthModuleConfig,
			ContentModule,
			DBModule,
			DiscoveryModule,
			DocumentModule,
			EmailModule.forRoot(
				categorized.email?.adapter,
				categorized.email?.defaults,
			),
			EnvironmentModule,
			GeneralModule,
			EventsModule,
			HistoryModule,
			HealthModule,
			NotificationModule.forRoot(),
			PluginModule.forRoot({ plugins: pluginConfigs }),
			RBACModule.forRoot(globalOptions?.rbac),
			SettingsModule.forRoot(),
			StorageModuleConfig,
			VaultModuleConfig,
			WebhookModule.forRoot(),
			ViewConfigModule,
		]

		// Add AdminServeModule if enabled
		if (adminConfig.enabled) {
			const adminModule = AdminServeModule.forRoot(adminConfig)
			if (adminModule) {
				imports.push(adminModule)
			}
		}

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
				ContentModule,
				DiscoveryModule,
				DBModule,
				DocumentModule,
				SettingsModule,
				HistoryModule,
				HealthModule,
				NotificationModule,
				PluginModule,
				StorageModuleConfig,
				VaultModuleConfig,
			],
		}
	}

	static async forFeature(schemas: Type | Type[]): Promise<DynamicModule> {
		return DatabaseModule.forFeature(schemas)
	}
}
