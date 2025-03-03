import { Model, getModelToken } from '@magnet/common'
import { DynamicModule, Module, Type, forwardRef } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { DatabaseModule } from '~/modules/database'
import { AdminModule } from '../admin/admin.module'
import { Setting } from './schemas/setting.schema'
import { SettingsController } from './settings.controller'
import { SettingsService } from './settings.service'

@Module({
	imports: [
		forwardRef(() => DatabaseModule),
		forwardRef(() => DatabaseModule.forFeature(Setting)),
		AdminModule,
	],
	controllers: [SettingsController],
	providers: [
		{
			provide: 'SETTING_MODEL',
			useFactory: async (moduleRef: ModuleRef) => {
				await new Promise((resolve) => setTimeout(resolve, 1000))

				try {
					const settingModel = await moduleRef.get(getModelToken(Setting), {
						strict: false,
					})

					if (!settingModel) {
						throw new Error(`Model for ${Setting.name} not found`)
					}

					return settingModel
				} catch (error) {
					console.error('Error getting Setting model:', error)
					throw error
				}
			},
			inject: [ModuleRef],
		},
		{
			provide: SettingsService,
			useFactory: (settingModel: Model<Setting>) => {
				return new SettingsService(settingModel)
			},
			inject: ['SETTING_MODEL'],
		},
	],
	exports: [
		forwardRef(() => DatabaseModule.forFeature(Setting)),
		SettingsService,
	],
})
export class SettingsModule {
	static forFeature(schemas: Type | Type[]): DynamicModule {
		const schemaArray = Array.isArray(schemas) ? schemas : [schemas]

		const settingsRegistrations = schemaArray.flatMap((schema: Type) => [
			{
				provide: `${schema.name}_SETTING_REGISTRATION`,
				useFactory: async (settingsService: SettingsService): Promise<Type> => {
					await settingsService.registerSettingsFromSchema(schema.name, schema)
					return schema
				},
				inject: [SettingsService],
			},
			{
				provide: getModelToken(schema),
				useClass: schema,
			},
		])

		return {
			module: SettingsModule,
			providers: [...settingsRegistrations],
			exports: [...settingsRegistrations],
		}
	}
}
