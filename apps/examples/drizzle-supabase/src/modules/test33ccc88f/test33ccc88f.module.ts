import { MagnetModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { Test33CCC88FController } from './test33ccc88f.controller'
import { Test33CCC88F } from './test33ccc88f.schema'
import { Test33CCC88FService } from './test33ccc88f.service'

@Module({
	imports: [MagnetModule.forFeature(Test33CCC88F)],
	controllers: [Test33CCC88FController],
	providers: [Test33CCC88FService],
})
export class Test33CCC88FModule {}
