import { MagnetModuleOptions } from '@magnet-cms/common'
import { DynamicModule, Module, Type, ValidationPipe } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_PIPE, DiscoveryModule } from '@nestjs/core'
import { RestrictedGuard } from './guards/restricted.guard'
import { GlobalExceptionFilter } from './handlers'
import {
	AdminServeModule,
	type AdminServeOptions,
} from './modules/admin-serve/admin-serve.module'
import { AdminModule } from './modules/admin/admin.module'
import { AuthModule } from './modules/auth/auth.module'
import { ContentModule } from './modules/content/content.module'
import { DatabaseModule } from './modules/database/database.module'
import { DocumentModule } from './modules/document/document.module'
import { EnvironmentModule } from './modules/environment/environment.module'
import { EventsModule } from './modules/events/events.module'
import { HealthModule } from './modules/health/health.module'
import { HistoryModule } from './modules/history/history.module'
import { PluginModule } from './modules/plugin/plugin.module'
import { SettingsModule } from './modules/settings/settings.module'
import { StorageModule } from './modules/storage/storage.module'
import { initOptions } from './utils'

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

@Module({})
export class MagnetModule {
	static forRoot(options?: MagnetModuleOptions): DynamicModule {
		const defaultOptions: MagnetModuleOptions = initOptions(options)
		const plugins = defaultOptions.plugins || []

		const DBModule = DatabaseModule.register(defaultOptions)
		const StorageModuleConfig = StorageModule.forRoot(defaultOptions.storage)

		const AuthModuleConfig = AuthModule.forRoot(defaultOptions.auth)

		// Normalize admin config and conditionally add AdminServeModule
		const adminConfig = normalizeAdminConfig(defaultOptions.admin)
		const imports: Array<DynamicModule | Type> = [
			AdminModule,
			AuthModuleConfig,
			ContentModule,
			DBModule,
			DiscoveryModule,
			DocumentModule,
			EnvironmentModule,
			EventsModule,
			HistoryModule,
			HealthModule,
			PluginModule.forRoot({ plugins }),
			SettingsModule,
			StorageModuleConfig,
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
				{ provide: MagnetModuleOptions, useValue: defaultOptions },
				{ provide: APP_GUARD, useClass: RestrictedGuard },
			],
			exports: [
				MagnetModuleOptions,
				ContentModule,
				DiscoveryModule,
				DBModule,
				DocumentModule,
				SettingsModule,
				HistoryModule,
				HealthModule,
				PluginModule,
				StorageModuleConfig,
			],
		}
	}

	static async forFeature(schemas: Type | Type[]): Promise<DynamicModule> {
		return DatabaseModule.forFeature(schemas)
	}
}
