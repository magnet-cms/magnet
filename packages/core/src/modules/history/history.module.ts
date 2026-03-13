import { Model, getModelToken } from '@magnet-cms/common'
import { Logger, Module, forwardRef } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { DatabaseModule } from '~/modules/database'
import { MagnetLogger } from '~/modules/logging/logger.service'
import { SettingsModule } from '~/modules/settings'
import { SettingsService } from '../settings/settings.service'
import { HistoryController } from './history.controller'
import { HistoryService } from './history.service'
import { History } from './schemas/history.schema'
import { Versioning } from './setting/history.setting'

@Module({
	imports: [
		forwardRef(() => DatabaseModule),
		forwardRef(() => DatabaseModule.forFeature(History)),
		forwardRef(() => SettingsModule.forFeature(Versioning)),
	],
	controllers: [HistoryController],
	providers: [
		{
			provide: 'HISTORY_MODEL',
			useFactory: async (moduleRef: ModuleRef) => {
				await new Promise((resolve) => setTimeout(resolve, 1000))

				try {
					const historyModel = await moduleRef.get(getModelToken(History), {
						strict: false,
					})

					if (!historyModel) {
						throw new Error(`Model for ${History.name} not found`)
					}

					return historyModel
				} catch (error) {
					new Logger('HistoryModule').error(
						'Error getting History model:',
						error,
					)
					throw error
				}
			},
			inject: [ModuleRef],
		},
		{
			provide: HistoryService,
			useFactory: (
				historyModel: Model<History>,
				settingsService: SettingsService,
				logger: MagnetLogger,
			) => {
				return new HistoryService(historyModel, settingsService, logger)
			},
			inject: ['HISTORY_MODEL', SettingsService, MagnetLogger],
		},
	],
	exports: [
		forwardRef(() => DatabaseModule.forFeature(History)),
		HistoryService,
	],
})
export class HistoryModule {}
