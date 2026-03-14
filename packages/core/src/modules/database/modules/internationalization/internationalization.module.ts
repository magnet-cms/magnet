import { Module, forwardRef } from '@nestjs/common'
import { SettingsModule } from '~/modules/settings'
import { InternationalizationService } from './internationalization.service'
import { InternationalizationSettings } from './internationalization.settings'

@Module({
	imports: [
		forwardRef(() => SettingsModule.forFeature(InternationalizationSettings)),
	],
	providers: [InternationalizationService],
	exports: [InternationalizationService],
})
export class InternationalizationModule {}
