import { Module } from '@nestjs/common'

import { ViewConfig } from './schemas/view-config.schema'
import { ViewConfigController } from './view-config.controller'
import { ViewConfigService } from './view-config.service'

import { DatabaseModule } from '~/modules/database'

@Module({
  imports: [DatabaseModule.forFeature(ViewConfig)],
  controllers: [ViewConfigController],
  providers: [ViewConfigService],
  exports: [ViewConfigService],
})
export class ViewConfigModule {}
