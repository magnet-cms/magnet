import { Module, forwardRef } from '@nestjs/common'

import { DiscoveryModule } from '../discovery/discovery.module'

import { ContentController } from './content.controller'
import { ContentService } from './content.service'
import { ContentSettings } from './content.settings'

import { DocumentModule } from '~/modules/document/document.module'
import { HistoryModule } from '~/modules/history/history.module'
import { SettingsModule } from '~/modules/settings'

@Module({
  imports: [
    forwardRef(() => DocumentModule),
    forwardRef(() => HistoryModule),
    SettingsModule.forFeature(ContentSettings),
    DiscoveryModule,
  ],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
