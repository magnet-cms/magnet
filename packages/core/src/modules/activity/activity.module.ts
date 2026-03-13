import { Model, getModelToken } from '@magnet-cms/common'
import { Logger, Module, forwardRef } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { DatabaseModule } from '~/modules/database'
import { MagnetLogger } from '~/modules/logging/logger.service'
import { SettingsModule } from '~/modules/settings'
import { SettingsService } from '~/modules/settings/settings.service'
import { ActivityController } from './activity.controller'
import { ActivityService } from './activity.service'
import { ActivitySettings } from './activity.settings'
import { Activity } from './schemas/activity.schema'

@Module({
	imports: [
		forwardRef(() => DatabaseModule),
		forwardRef(() => DatabaseModule.forFeature(Activity)),
		forwardRef(() => SettingsModule.forFeature(ActivitySettings)),
	],
	controllers: [ActivityController],
	providers: [
		{
			provide: 'ACTIVITY_MODEL',
			useFactory: async (moduleRef: ModuleRef) => {
				await new Promise((resolve) => setTimeout(resolve, 1000))

				try {
					const activityModel = await moduleRef.get(getModelToken(Activity), {
						strict: false,
					})

					if (!activityModel) {
						throw new Error(`Model for ${Activity.name} not found`)
					}

					return activityModel
				} catch (error) {
					new Logger('ActivityModule').error(
						'Error getting Activity model:',
						error,
					)
					throw error
				}
			},
			inject: [ModuleRef],
		},
		{
			provide: ActivityService,
			useFactory: (
				activityModel: Model<Activity>,
				settingsService: SettingsService,
				logger: MagnetLogger,
			) => {
				return new ActivityService(activityModel, settingsService, logger)
			},
			inject: ['ACTIVITY_MODEL', SettingsService, MagnetLogger],
		},
	],
	exports: [
		forwardRef(() => DatabaseModule.forFeature(Activity)),
		ActivityService,
	],
})
export class ActivityModule {}
