import { MagnetModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { Test9FFD8D62Controller } from './test9ffd8d62.controller'
import { Test9FFD8D62 } from './test9ffd8d62.schema'
import { Test9FFD8D62Service } from './test9ffd8d62.service'

@Module({
	imports: [MagnetModule.forFeature(Test9FFD8D62)],
	controllers: [Test9FFD8D62Controller],
	providers: [Test9FFD8D62Service],
})
export class Test9FFD8D62Module {}
