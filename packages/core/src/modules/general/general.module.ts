import { Module } from '@nestjs/common'
import { SettingsModule } from '~/modules/settings'
import { GeneralSettings } from './general.settings'

@Module({
	imports: [SettingsModule.forFeature(GeneralSettings)],
})
export class GeneralModule {}
