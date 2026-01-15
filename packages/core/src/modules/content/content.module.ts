import { Module, forwardRef } from '@nestjs/common'
import { DocumentModule } from '~/modules/document/document.module'
import { HistoryModule } from '~/modules/history/history.module'
import { ContentController } from './content.controller'
import { ContentService } from './content.service'

@Module({
	imports: [forwardRef(() => DocumentModule), forwardRef(() => HistoryModule)],
	controllers: [ContentController],
	providers: [ContentService],
	exports: [ContentService],
})
export class ContentModule {}
