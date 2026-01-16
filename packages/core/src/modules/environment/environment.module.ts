import { Module, forwardRef } from '@nestjs/common'
import { SettingsModule } from '~/modules/settings/settings.module'
import { EnvironmentController } from './environment.controller'
import { EnvironmentService } from './environment.service'
import { Environments } from './setting/environment.setting'

@Module({
	imports: [forwardRef(() => SettingsModule.forFeature(Environments))],
	controllers: [EnvironmentController],
	providers: [EnvironmentService],
	exports: [EnvironmentService],
})
export class EnvironmentModule {}
