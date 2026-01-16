import { Model, getModelToken } from '@magnet-cms/common'
import { DynamicModule, Module, Type, forwardRef } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { DatabaseModule } from '~/modules/database'
import { Setting } from './schemas/setting.schema'
import { SettingsController } from './settings.controller'
import { SettingsService } from './settings.service'

@Module({
	imports: [
		forwardRef(() => DatabaseModule),
		forwardRef(() => DatabaseModule.forFeature(Setting)),
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
	static forRoot(): DynamicModule {
		return {
			module: SettingsModule,
			global: true,
			imports: [
				forwardRef(() => DatabaseModule),
				forwardRef(() => DatabaseModule.forFeature(Setting)),
			],
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
			exports: [SettingsService],
		}
	}

	static forFeature(schemas: Type | Type[]): DynamicModule {
		const schemaArray = Array.isArray(schemas) ? schemas : [schemas]

		const settingsRegistrations = schemaArray.flatMap((schema: Type) => [
			{
				provide: `${schema.name}_SETTING_REGISTRATION`,
				useFactory: async (settingsService: SettingsService): Promise<Type> => {
					// Use lowercase group name to match frontend URL conventions
					const groupName = schema.name.toLowerCase()
					await settingsService.registerSettingsFromSchema(groupName, schema)
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
