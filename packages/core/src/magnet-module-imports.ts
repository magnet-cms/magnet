/**
 * Lazy-loaded module imports for MagnetModule.forRoot().
 *
 * This file is loaded only when forRoot() runs, after DatabaseModule.register()
 * has been called. Modules that use DatabaseModule.forFeature() must be
 * imported here (not in magnet.module.ts) to avoid load-order errors.
 */
import type {
	CacheAdapter,
	GraphQLMagnetProvider,
	PluginConfig,
	RBACModuleOptions,
} from '@magnet-cms/common'
import type {
	EmailAdapter,
	StorageAdapter,
	VaultAdapter,
} from '@magnet-cms/common'
import type { DBConfig, DatabaseAdapter } from '@magnet-cms/common'
import type { AuthConfig, OpenAPIConfig } from '@magnet-cms/common'
import type { DynamicModule, Type } from '@nestjs/common'
import { ActivityModule } from './modules/activity/activity.module'
import {
	AdminServeModule,
	type AdminServeOptions,
} from './modules/admin-serve/admin-serve.module'
import { AdminModule } from './modules/admin/admin.module'
import { ApiKeysModule } from './modules/api-keys/api-keys.module'
import { AuthModule } from './modules/auth/auth.module'
import { CacheModule } from './modules/cache/cache.module'
import { ContentModule } from './modules/content/content.module'
import { DiscoveryModule } from './modules/discovery/discovery.module'
import { DocumentModule } from './modules/document/document.module'
import { EmailModule } from './modules/email/email.module'
import { EnvironmentModule } from './modules/environment/environment.module'
import { GeneralModule } from './modules/general/general.module'
import { HistoryModule } from './modules/history/history.module'
import { NotificationModule } from './modules/notification/notification.module'
import { OpenAPIModule } from './modules/openapi/openapi.module'
import { PluginModule } from './modules/plugin/plugin.module'
import { RBACModule } from './modules/rbac/rbac.module'
import { SecurityModule } from './modules/security/security.module'
import { SettingsModule } from './modules/settings/settings.module'
import { StorageModule } from './modules/storage/storage.module'
import { VaultModule } from './modules/vault/vault.module'
import { ViewConfigModule } from './modules/view-config/view-config.module'
import { WebhookModule } from './modules/webhook/webhook.module'

export interface BuildImportsParams {
	DBModule: import('@nestjs/common').DynamicModule
	categorized: {
		database: { adapter: DatabaseAdapter; config: DBConfig }
		storage?: { adapter?: unknown; config?: unknown }
		vault?: {
			adapter?: unknown
			adapterFactory?: (moduleRef: unknown) => unknown
			adapterType?: 'db' | 'hashicorp' | 'supabase'
			config?: unknown
		}
		auth?: { config?: AuthConfig }
		plugins: { plugin: unknown; options?: Record<string, unknown> }[]
		email?: {
			adapter?: EmailAdapter | null
			defaults?: { from?: string; replyTo?: string }
		}
		cache?: { adapter?: CacheAdapter | null }
		graphql?: GraphQLMagnetProvider
	}
	globalOptions:
		| {
				rbac?: RBACModuleOptions
				email?: { layout?: unknown }
				openapi?: OpenAPIConfig | false
		  }
		| undefined
	adminConfig: AdminServeOptions
}

export function buildMagnetImports(params: BuildImportsParams): {
	imports: Array<DynamicModule | Type>
	DBModule: DynamicModule
	StorageModuleConfig: DynamicModule
	VaultModuleConfig: DynamicModule
	CacheModuleConfig: DynamicModule
} {
	const { DBModule, categorized, globalOptions, adminConfig } = params

	const StorageModuleConfig = StorageModule.forRoot(
		categorized.storage?.adapter as StorageAdapter | null | undefined,
		categorized.storage?.config as Record<string, unknown> | undefined,
	)
	const CacheModuleConfig = CacheModule.forRoot(
		(categorized.cache?.adapter as CacheAdapter | null | undefined) ?? null,
	)
	const VaultModuleConfig = VaultModule.forRoot(
		categorized.vault?.adapter as VaultAdapter | null | undefined,
		categorized.vault?.adapterFactory as
			| ((moduleRef: unknown) => VaultAdapter)
			| undefined,
		{
			...(categorized.vault?.config as { cacheTtl?: number } | undefined),
			adapter: categorized.vault?.adapterType as
				| 'db'
				| 'hashicorp'
				| 'supabase'
				| undefined,
		},
	)
	const AuthModuleConfig = AuthModule.forRoot(
		categorized.auth?.config ?? { strategy: 'jwt' },
	)
	const pluginConfigs = categorized.plugins.map((p) => ({
		plugin: p.plugin,
		options: p.options,
	})) as PluginConfig[]

	const imports: Array<DynamicModule | Type> = [
		DBModule,
		ActivityModule,
		DiscoveryModule,
		AdminModule,
		ApiKeysModule,
		AuthModuleConfig,
		CacheModuleConfig,
		ContentModule,
		DocumentModule,
		EmailModule.forRoot(
			(categorized.email?.adapter as EmailAdapter | null | undefined) ?? null,
			categorized.email?.defaults,
			{ layout: globalOptions?.email?.layout },
		),
		EnvironmentModule,
		GeneralModule,
		HistoryModule,
		NotificationModule.forRoot(),
		PluginModule.forRoot({ plugins: pluginConfigs }),
		RBACModule.forRoot(globalOptions?.rbac),
		SecurityModule,
		SettingsModule.forRoot(),
		StorageModuleConfig,
		VaultModuleConfig,
		WebhookModule.forRoot(),
		ViewConfigModule,
	]

	if (categorized.graphql) {
		imports.push(categorized.graphql.module as DynamicModule)
	}

	const _openapi = globalOptions?.openapi
	if (
		_openapi !== false &&
		(_openapi as OpenAPIConfig | undefined)?.enabled !== false
	) {
		imports.push(
			OpenAPIModule.forRoot(
				typeof _openapi === 'object' && _openapi !== null ? _openapi : {},
			),
		)
	}

	if (adminConfig.enabled) {
		const adminModule = AdminServeModule.forRoot(adminConfig)
		if (adminModule) {
			imports.push(adminModule)
		}
	}

	return {
		imports,
		DBModule: params.DBModule,
		StorageModuleConfig,
		VaultModuleConfig,
		CacheModuleConfig,
	}
}

// Re-export module classes for MagnetModule's exports array
export {
	ApiKeysModule,
	CacheModule,
	ContentModule,
	DiscoveryModule,
	DocumentModule,
	HistoryModule,
	NotificationModule,
	PluginModule,
	RBACModule,
	SettingsModule,
}
