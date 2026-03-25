import { Module, forwardRef } from '@nestjs/common'

import { EnvironmentController } from './environment.controller'
import { EnvironmentService } from './environment.service'
import { Environments } from './setting/environment.setting'

import { SettingsModule } from '~/modules/settings/settings.module'

@Module({
  imports: [forwardRef(() => SettingsModule.forFeature(Environments))],
  controllers: [EnvironmentController],
  providers: [EnvironmentService],
  exports: [EnvironmentService],
})
export class EnvironmentModule {}
