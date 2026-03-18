import { DatabaseModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { SettingsModule } from '~/modules/settings'
import { HistoryController } from './history.controller'
import { HistoryService } from './history.service'
import { History } from './schemas/history.schema'
import { Versioning } from './setting/history.setting'

@Module({
	imports: [
		DatabaseModule.forFeature(History),
		SettingsModule.forFeature(Versioning),
	],
	controllers: [HistoryController],
	providers: [HistoryService],
	exports: [HistoryService],
})
export class HistoryModule {}
