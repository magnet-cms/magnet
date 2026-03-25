import { Module, forwardRef } from '@nestjs/common'

import { InternationalizationService } from './internationalization.service'

import { GeneralSettings } from '~/modules/general/general.settings'
import { SettingsModule } from '~/modules/settings'

@Module({
  imports: [forwardRef(() => SettingsModule.forFeature(GeneralSettings))],
  providers: [InternationalizationService],
  exports: [InternationalizationService],
})
export class InternationalizationModule {}
