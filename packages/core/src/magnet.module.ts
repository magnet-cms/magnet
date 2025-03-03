import { MagnetModuleOptions } from '@magnet/common'
import { DynamicModule, Module, Type, ValidationPipe } from '@nestjs/common'
import { APP_FILTER, APP_PIPE, DiscoveryModule } from '@nestjs/core'
import { GlobalExceptionFilter } from './handlers'
import { AdminModule } from './modules/admin/admin.module'
import { AuthModule } from './modules/auth/auth.module'
import { DatabaseModule } from './modules/database/database.module'
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
				DBModule,
				DiscoveryModule,
				SettingsModule,
			],
			providers: [
				{ provide: APP_PIPE, useClass: ValidationPipe },
				{ provide: APP_FILTER, useClass: GlobalExceptionFilter },
				{ provide: MagnetModuleOptions, useValue: defaultOptions },
			],
			exports: [MagnetModuleOptions, DiscoveryModule, DBModule, SettingsModule],
		}
	}

	static async forFeature(schemas: Type | Type[]): Promise<DynamicModule> {
		return DatabaseModule.forFeature(schemas)
	}
}
