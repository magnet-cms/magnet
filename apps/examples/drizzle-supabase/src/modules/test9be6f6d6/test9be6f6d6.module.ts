import { MagnetModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { Test9BE6F6D6Controller } from './test9be6f6d6.controller'
import { Test9BE6F6D6 } from './test9be6f6d6.schema'
import { Test9BE6F6D6Service } from './test9be6f6d6.service'

@Module({
	imports: [MagnetModule.forFeature(Test9BE6F6D6)],
	controllers: [Test9BE6F6D6Controller],
	providers: [Test9BE6F6D6Service],
})
export class Test9BE6F6D6Module {}
