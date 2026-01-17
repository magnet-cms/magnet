import { MagnetModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { Article } from './schemas/article.schema'

@Module({
	imports: [MagnetModule.forFeature([Article])],
})
export class ArticlesModule {}
