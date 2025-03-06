import { Module } from '@nestjs/common'
import { SettingsModule } from '~/modules/settings'
import { InternationalizationService } from './internationalization.service'
import { Internationalization } from './setting/internationalization.setting'

@Module({
	imports: [SettingsModule.forFeature(Internationalization)],
	providers: [InternationalizationService],
	exports: [InternationalizationService],
})
export class InternationalizationModule {}
