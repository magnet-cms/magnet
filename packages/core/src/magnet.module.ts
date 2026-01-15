import { MagnetModuleOptions } from '@magnet/common'
import { DynamicModule, Module, Type, ValidationPipe } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_PIPE, DiscoveryModule } from '@nestjs/core'
import { RestrictedGuard } from './guards/restricted.guard'
import { GlobalExceptionFilter } from './handlers'
import { AdminModule } from './modules/admin/admin.module'
import { AuthModule } from './modules/auth/auth.module'
import { ContentModule } from './modules/content/content.module'
import { DatabaseModule } from './modules/database/database.module'
import { DocumentModule } from './modules/document/document.module'
import { EnvironmentModule } from './modules/environment/environment.module'
import { HealthModule } from './modules/health/health.module'
import { HistoryModule } from './modules/history/history.module'
import { PlaygroundModule } from './modules/playground/playground.module'
import { SettingsModule } from './modules/settings/settings.module'
import { initOptions } from './utils'

@Module({})
export class MagnetModule {
	static forRoot(options?: MagnetModuleOptions): DynamicModule {
		const defaultOptions: MagnetModuleOptions = initOptions(options)

		const DBModule = DatabaseModule.register(defaultOptions)

		return {
			module: MagnetModule,
			global: true,
			imports: [
				AdminModule,
				AuthModule,
				ContentModule,
				DBModule,
				DiscoveryModule,
				DocumentModule,
				EnvironmentModule,
				HistoryModule,
				HealthModule,
				PlaygroundModule,
				SettingsModule,
			],
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
			],
		}
	}

	static async forFeature(schemas: Type | Type[]): Promise<DynamicModule> {
		return DatabaseModule.forFeature(schemas)
	}
}
