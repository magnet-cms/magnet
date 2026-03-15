import { MagnetModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { Test17002FCDController } from './test17002fcd.controller'
import { Test17002FCD } from './test17002fcd.schema'
import { Test17002FCDService } from './test17002fcd.service'

@Module({
	imports: [MagnetModule.forFeature(Test17002FCD)],
	controllers: [Test17002FCDController],
	providers: [Test17002FCDService],
})
export class Test17002FCDModule {}
