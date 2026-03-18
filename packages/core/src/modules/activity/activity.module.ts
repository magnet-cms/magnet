import { DatabaseModule } from '@magnet-cms/core'
import { Module, forwardRef } from '@nestjs/common'
import { SettingsModule } from '~/modules/settings'
import { UserModule } from '~/modules/user/user.module'
import { ActivityController } from './activity.controller'
import { ActivityService } from './activity.service'
import { ActivitySettings } from './activity.settings'
import { Activity } from './schemas/activity.schema'

@Module({
	imports: [
		DatabaseModule.forFeature(Activity),
		SettingsModule.forFeature(ActivitySettings),
		forwardRef(() => UserModule),
	],
	controllers: [ActivityController],
	providers: [ActivityService],
	exports: [ActivityService],
})
export class ActivityModule {}
