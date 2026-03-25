import { Module, forwardRef } from '@nestjs/common'

import { ActivityController } from './activity.controller'
import { ActivityService } from './activity.service'
import { ActivitySettings } from './activity.settings'
import { Activity } from './schemas/activity.schema'

import { DatabaseModule } from '~/modules/database'
import { SettingsModule } from '~/modules/settings'
import { UserModule } from '~/modules/user/user.module'

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
