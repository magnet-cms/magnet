import { Module } from '@nestjs/common'

import { GeneralSettings } from './general.settings'

import { SettingsModule } from '~/modules/settings'

@Module({
  imports: [SettingsModule.forFeature(GeneralSettings)],
})
export class GeneralModule {}
