import { Module, forwardRef } from '@nestjs/common'
import { GeneralSettings } from '~/modules/general/general.settings'
import { SettingsModule } from '~/modules/settings'
import { InternationalizationService } from './internationalization.service'

@Module({
	imports: [forwardRef(() => SettingsModule.forFeature(GeneralSettings))],
	providers: [InternationalizationService],
	exports: [InternationalizationService],
})
export class InternationalizationModule {}
