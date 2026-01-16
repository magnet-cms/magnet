import { MagnetModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { CatsController } from './cats.controller'
import { CatsService } from './cats.service'
import { Cat } from './schemas/cat.schema'

@Module({
	imports: [MagnetModule.forFeature(Cat)],
	controllers: [CatsController],
	providers: [CatsService],
})
export class CatsModule {}
