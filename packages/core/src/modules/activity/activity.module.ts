import { Module } from '@nestjs/common'
import { DatabaseModule } from '~/modules/database'
import { SettingsModule } from '~/modules/settings'
import { ActivityController } from './activity.controller'
import { ActivityService } from './activity.service'
import { ActivitySettings } from './activity.settings'
import { Activity } from './schemas/activity.schema'

@Module({
	imports: [
		DatabaseModule.forFeature(Activity),
		SettingsModule.forFeature(ActivitySettings),
	],
	controllers: [ActivityController],
	providers: [ActivityService],
	exports: [ActivityService],
})
export class ActivityModule {}
